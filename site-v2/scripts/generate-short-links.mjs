import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  bookingLocales,
  fallbackBookingLocale,
  fallbackLocale,
  redirectFixtures,
  sectionSlugs,
  shortLinkGroups,
  siteOrigin,
  slugPattern,
} from './short-links.config.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const SITE_DIR = path.resolve(SCRIPT_DIR, '..');
const HTACCESS_PATH = path.join(SITE_DIR, 'public/.htaccess');
const DOC_PATH = path.join(SITE_DIR, 'docs/SHORT_LINKS.md');
const LEGACY_MARKER = '# Legacy production redirects.';
const GENERATED_START = '# BEGIN generated short marketing links';
const GENERATED_END = '# END generated short marketing links';
const FLAGS = '[R=302,L,NE,QSA]';
const SUPPORTED_LOCALE_PATTERN = `(${bookingLocales.join('|')})`;
const TWO_LETTER_LOCALE_PATTERN = '[A-Za-z]{2}';
const SLUG_CAPTURE = `(${slugPattern})`;
const SECTION_CAPTURE = `(${sectionSlugs.join('|')})`;

function query(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function rule(pattern, destination) {
  return `RewriteRule ^${pattern}$ ${destination} ${FLAGS}`;
}

function homeDestination(locale, bookingLocale, params, hash = null) {
  const suffix = hash ? `#${hash}` : '';
  return `/${locale}/?${destinationQuery(bookingLocale, params)}${suffix}`;
}

function eventDestination(locale, event, bookingLocale, params) {
  return `/${locale}/events/${event}/?${destinationQuery(bookingLocale, params)}`;
}

function sectionDestination(locale, section, bookingLocale, params) {
  return homeDestination(locale, bookingLocale, params, section);
}

function pageDestination(locale, pagePath, bookingLocale, params) {
  return `/${locale}/${pagePath}/?${destinationQuery(bookingLocale, params)}`;
}

function destinationQuery(bookingLocale, params) {
  if (!params.openBooking) {
    return query({ lang: bookingLocale, ...params });
  }

  const { openBooking, ...rest } = params;
  return query({ openBooking, lang: bookingLocale, ...rest });
}

function baseEventParams(group) {
  return {
    utm_source: group.source,
    utm_medium: group.medium,
    utm_campaign: group.baseCampaign,
    utm_content: group.content,
  };
}

function eventParams(group, event, campaign = `event_${event}`) {
  const eventContent = Object.hasOwn(group, 'eventContent') ? group.eventContent : 'event_link';
  return {
    utm_source: group.source,
    utm_medium: group.medium,
    utm_campaign: campaign,
    utm_content: eventContent,
  };
}

function sectionParams(group, section, campaign = `section_${section}`) {
  return {
    utm_source: group.source,
    utm_medium: group.medium,
    utm_campaign: campaign,
    utm_content: `section_${section}`,
  };
}

function pageParams(group, page, campaign = page.campaign) {
  return {
    utm_source: group.source,
    utm_medium: group.medium,
    utm_campaign: campaign,
    utm_content: page.content,
  };
}

function baseHash(group) {
  return Object.hasOwn(group, 'baseHash') ? group.baseHash : 'events';
}

function bookingBaseParams(group, bookingSource = group.baseBookingSource, campaign = group.baseCampaign, content = group.baseContent) {
  return {
    openBooking: '1',
    booking_source: bookingSource,
    utm_source: group.source,
    utm_medium: group.medium,
    utm_campaign: campaign,
    utm_content: content,
  };
}

function bookingCampaignParams(group, campaign) {
  return bookingBaseParams(group, group.bookingSource, campaign, 'booking');
}

function leadBaseParams(group, campaign = 'lead_form') {
  return {
    openBooking: '1',
    booking_source: group.bookingSource,
    utm_source: group.source,
    utm_medium: group.medium,
    utm_campaign: campaign,
    utm_content: 'lead_form_thank_you',
  };
}

function addBaseHomeRules(lines, prefix, group, params, hash = null) {
  lines.push(rule(`${prefix}/?`, homeDestination(fallbackLocale, fallbackBookingLocale, params, hash)));
  lines.push(rule(`${prefix}/${SUPPORTED_LOCALE_PATTERN}/?`, homeDestination('$1', '$1', params, hash)));
  lines.push(rule(`${prefix}/fr/?`, homeDestination('fr', fallbackBookingLocale, params, hash)));
  lines.push(rule(`${prefix}/${TWO_LETTER_LOCALE_PATTERN}/?`, homeDestination(fallbackLocale, fallbackBookingLocale, params, hash)));
}

function addEventRules(lines, prefix, group, options = {}) {
  if (!options.localePrefixed) {
    addBaseHomeRules(lines, prefix, group, baseEventParams(group), baseHash(group));

    if (group.pageLinks) {
      group.pageLinks.forEach((page) => {
        lines.push(rule(`${prefix}/${SUPPORTED_LOCALE_PATTERN}/${page.slug}/${SLUG_CAPTURE}/?`, pageDestination('$1', page.path, '$1', pageParams(group, page, '$2'))));
        lines.push(rule(`${prefix}/fr/${page.slug}/${SLUG_CAPTURE}/?`, pageDestination('fr', page.path, fallbackBookingLocale, pageParams(group, page, '$1'))));
        lines.push(rule(`${prefix}/(${TWO_LETTER_LOCALE_PATTERN})/${page.slug}/${SLUG_CAPTURE}/?`, pageDestination(fallbackLocale, page.path, fallbackBookingLocale, pageParams(group, page, '$2'))));
        lines.push(rule(`${prefix}/${page.slug}/${SLUG_CAPTURE}/?`, pageDestination(fallbackLocale, page.path, fallbackBookingLocale, pageParams(group, page, '$1'))));

        lines.push(rule(`${prefix}/${SUPPORTED_LOCALE_PATTERN}/${page.slug}/?`, pageDestination('$1', page.path, '$1', pageParams(group, page))));
        lines.push(rule(`${prefix}/fr/${page.slug}/?`, pageDestination('fr', page.path, fallbackBookingLocale, pageParams(group, page))));
        lines.push(rule(`${prefix}/(${TWO_LETTER_LOCALE_PATTERN})/${page.slug}/?`, pageDestination(fallbackLocale, page.path, fallbackBookingLocale, pageParams(group, page))));
        lines.push(rule(`${prefix}/${page.slug}/?`, pageDestination(fallbackLocale, page.path, fallbackBookingLocale, pageParams(group, page))));
      });
    }

    if (group.sectionLinks) {
      lines.push(rule(`${prefix}/${SUPPORTED_LOCALE_PATTERN}/${SECTION_CAPTURE}/${SLUG_CAPTURE}/?`, sectionDestination('$1', '$2', '$1', sectionParams(group, '$2', '$3'))));
      lines.push(rule(`${prefix}/fr/${SECTION_CAPTURE}/${SLUG_CAPTURE}/?`, sectionDestination('fr', '$1', fallbackBookingLocale, sectionParams(group, '$1', '$2'))));
      lines.push(rule(`${prefix}/(${TWO_LETTER_LOCALE_PATTERN})/${SECTION_CAPTURE}/${SLUG_CAPTURE}/?`, sectionDestination(fallbackLocale, '$2', fallbackBookingLocale, sectionParams(group, '$2', '$3'))));
      lines.push(rule(`${prefix}/${SECTION_CAPTURE}/${SLUG_CAPTURE}/?`, sectionDestination(fallbackLocale, '$1', fallbackBookingLocale, sectionParams(group, '$1', '$2'))));

      lines.push(rule(`${prefix}/${SUPPORTED_LOCALE_PATTERN}/${SECTION_CAPTURE}/?`, sectionDestination('$1', '$2', '$1', sectionParams(group, '$2'))));
      lines.push(rule(`${prefix}/fr/${SECTION_CAPTURE}/?`, sectionDestination('fr', '$1', fallbackBookingLocale, sectionParams(group, '$1'))));
      lines.push(rule(`${prefix}/(${TWO_LETTER_LOCALE_PATTERN})/${SECTION_CAPTURE}/?`, sectionDestination(fallbackLocale, '$2', fallbackBookingLocale, sectionParams(group, '$2'))));
      lines.push(rule(`${prefix}/${SECTION_CAPTURE}/?`, sectionDestination(fallbackLocale, '$1', fallbackBookingLocale, sectionParams(group, '$1'))));
    }

    if (group.campaignOverride) {
      lines.push(rule(`${prefix}/${SUPPORTED_LOCALE_PATTERN}/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination('$1', '$2', '$1', eventParams(group, '$2', '$3'))));
      lines.push(rule(`${prefix}/fr/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination('fr', '$1', fallbackBookingLocale, eventParams(group, '$1', '$2'))));
      lines.push(rule(`${prefix}/(${TWO_LETTER_LOCALE_PATTERN})/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination(fallbackLocale, '$2', fallbackBookingLocale, eventParams(group, '$2', '$3'))));
      lines.push(rule(`${prefix}/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination(fallbackLocale, '$1', fallbackBookingLocale, eventParams(group, '$1', '$2'))));
    }

    lines.push(rule(`${prefix}/${SUPPORTED_LOCALE_PATTERN}/${SLUG_CAPTURE}/?`, eventDestination('$1', '$2', '$1', eventParams(group, '$2'))));
    lines.push(rule(`${prefix}/fr/${SLUG_CAPTURE}/?`, eventDestination('fr', '$1', fallbackBookingLocale, eventParams(group, '$1'))));
    lines.push(rule(`${prefix}/(${TWO_LETTER_LOCALE_PATTERN})/${SLUG_CAPTURE}/?`, eventDestination(fallbackLocale, '$2', fallbackBookingLocale, eventParams(group, '$2'))));
    lines.push(rule(`${prefix}/${SLUG_CAPTURE}/?`, eventDestination(fallbackLocale, '$1', fallbackBookingLocale, eventParams(group, '$1'))));
    return;
  }

  const prefixStart = `${SUPPORTED_LOCALE_PATTERN}/${prefix}`;
  const frPrefix = `fr/${prefix}`;
  const unknownPrefix = `(${TWO_LETTER_LOCALE_PATTERN})/${prefix}`;

  {
    const baseParams = baseEventParams(group);
    lines.push(rule(`${prefixStart}/?`, homeDestination('$1', '$1', baseParams, baseHash(group))));
    lines.push(rule(`${frPrefix}/?`, homeDestination('fr', fallbackBookingLocale, baseParams, baseHash(group))));
    lines.push(rule(`${unknownPrefix}/?`, homeDestination(fallbackLocale, fallbackBookingLocale, baseParams, baseHash(group))));
  }

  if (group.campaignOverride) {
    if (group.sectionLinks) {
      lines.push(rule(`${prefixStart}/${SECTION_CAPTURE}/${SLUG_CAPTURE}/?`, sectionDestination('$1', '$2', '$1', sectionParams(group, '$2', '$3'))));
      lines.push(rule(`${frPrefix}/${SECTION_CAPTURE}/${SLUG_CAPTURE}/?`, sectionDestination('fr', '$1', fallbackBookingLocale, sectionParams(group, '$1', '$2'))));
      lines.push(rule(`${unknownPrefix}/${SECTION_CAPTURE}/${SLUG_CAPTURE}/?`, sectionDestination(fallbackLocale, '$2', fallbackBookingLocale, sectionParams(group, '$2', '$3'))));

      lines.push(rule(`${prefixStart}/${SECTION_CAPTURE}/?`, sectionDestination('$1', '$2', '$1', sectionParams(group, '$2'))));
      lines.push(rule(`${frPrefix}/${SECTION_CAPTURE}/?`, sectionDestination('fr', '$1', fallbackBookingLocale, sectionParams(group, '$1'))));
      lines.push(rule(`${unknownPrefix}/${SECTION_CAPTURE}/?`, sectionDestination(fallbackLocale, '$2', fallbackBookingLocale, sectionParams(group, '$2'))));
    }

    lines.push(rule(`${prefixStart}/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination('$1', '$2', '$1', eventParams(group, '$2', '$3'))));
    lines.push(rule(`${frPrefix}/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination('fr', '$1', fallbackBookingLocale, eventParams(group, '$1', '$2'))));
    lines.push(rule(`${unknownPrefix}/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination(fallbackLocale, '$2', fallbackBookingLocale, eventParams(group, '$2', '$3'))));
  }

  lines.push(rule(`${prefixStart}/${SLUG_CAPTURE}/?`, eventDestination('$1', '$2', '$1', eventParams(group, '$2'))));
  lines.push(rule(`${frPrefix}/${SLUG_CAPTURE}/?`, eventDestination('fr', '$1', fallbackBookingLocale, eventParams(group, '$1'))));
  lines.push(rule(`${unknownPrefix}/${SLUG_CAPTURE}/?`, eventDestination(fallbackLocale, '$2', fallbackBookingLocale, eventParams(group, '$2'))));
}

function addBookingRules(lines, group) {
  addBaseHomeRules(lines, group.prefix, group, bookingBaseParams(group));

  lines.push(rule(`${group.prefix}/${SUPPORTED_LOCALE_PATTERN}/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination('$1', '$2', '$1', bookingCampaignParams(group, '$3'))));
  lines.push(rule(`${group.prefix}/fr/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination('fr', '$1', fallbackBookingLocale, bookingCampaignParams(group, '$2'))));
  lines.push(rule(`${group.prefix}/(${TWO_LETTER_LOCALE_PATTERN})/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination(fallbackLocale, '$2', fallbackBookingLocale, bookingCampaignParams(group, '$3'))));

  lines.push(rule(`${group.prefix}/${SUPPORTED_LOCALE_PATTERN}/${SLUG_CAPTURE}/?`, homeDestination('$1', '$1', bookingCampaignParams(group, '$2'))));
  lines.push(rule(`${group.prefix}/fr/${SLUG_CAPTURE}/?`, homeDestination('fr', fallbackBookingLocale, bookingCampaignParams(group, '$1'))));
  lines.push(rule(`${group.prefix}/(${TWO_LETTER_LOCALE_PATTERN})/${SLUG_CAPTURE}/?`, homeDestination(fallbackLocale, fallbackBookingLocale, bookingCampaignParams(group, '$2'))));

  lines.push(rule(`${group.prefix}/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination(fallbackLocale, '$1', fallbackBookingLocale, bookingCampaignParams(group, '$2'))));
  lines.push(rule(`${group.prefix}/${SLUG_CAPTURE}/?`, homeDestination(fallbackLocale, fallbackBookingLocale, bookingCampaignParams(group, '$1'))));
}

function addLeadRules(lines, group) {
  lines.push(rule(`${group.prefix}/?`, homeDestination(fallbackLocale, fallbackBookingLocale, leadBaseParams(group))));
  lines.push(rule(`${group.prefix}/${SUPPORTED_LOCALE_PATTERN}/?`, homeDestination('$1', '$1', leadBaseParams(group))));
  lines.push(rule(`${group.prefix}/fr/?`, homeDestination('fr', fallbackBookingLocale, leadBaseParams(group))));

  lines.push(rule(`${group.prefix}/${SUPPORTED_LOCALE_PATTERN}/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination('$1', '$2', '$1', leadBaseParams(group, '$3'))));
  lines.push(rule(`${group.prefix}/fr/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination('fr', '$1', fallbackBookingLocale, leadBaseParams(group, '$2'))));
  lines.push(rule(`${group.prefix}/(${TWO_LETTER_LOCALE_PATTERN})/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination(fallbackLocale, '$2', fallbackBookingLocale, leadBaseParams(group, '$3'))));

  lines.push(rule(`${group.prefix}/${SUPPORTED_LOCALE_PATTERN}/${SLUG_CAPTURE}/?`, homeDestination('$1', '$1', leadBaseParams(group, '$2'))));
  lines.push(rule(`${group.prefix}/fr/${SLUG_CAPTURE}/?`, homeDestination('fr', fallbackBookingLocale, leadBaseParams(group, '$1'))));
  lines.push(rule(`${group.prefix}/(${TWO_LETTER_LOCALE_PATTERN})/${SLUG_CAPTURE}/?`, homeDestination(fallbackLocale, fallbackBookingLocale, leadBaseParams(group, '$2'))));
  lines.push(rule(`${group.prefix}/${TWO_LETTER_LOCALE_PATTERN}/?`, homeDestination(fallbackLocale, fallbackBookingLocale, leadBaseParams(group))));

  lines.push(rule(`${group.prefix}/${SLUG_CAPTURE}/${SLUG_CAPTURE}/?`, eventDestination(fallbackLocale, '$1', fallbackBookingLocale, leadBaseParams(group, '$2'))));
  lines.push(rule(`${group.prefix}/${SLUG_CAPTURE}/?`, homeDestination(fallbackLocale, fallbackBookingLocale, leadBaseParams(group, '$1'))));
}

export function buildShortLinkRules() {
  const lines = [
    GENERATED_START,
    '# Generated by scripts/generate-short-links.mjs from scripts/short-links.config.mjs.',
    '# Keep these temporary redirects so campaign targets can change without long-lived caches.',
  ];

  shortLinkGroups.forEach((group, index) => {
    if (index > 0) lines.push('');

    if (group.kind === 'event') {
      addEventRules(lines, group.prefix, group);
      if (group.localePrefixAliases) {
        lines.push('');
        lines.push(`# Locale-prefixed compatibility aliases for ${group.prefix}.`);
        addEventRules(lines, group.prefix, group, { localePrefixed: true });
      }
    } else if (group.kind === 'booking') {
      addBookingRules(lines, group);
    } else if (group.kind === 'lead') {
      addLeadRules(lines, group);
    }
  });

  lines.push(GENERATED_END);
  return lines.join('\n');
}

function legacyRedirectBlock(existingHtaccess) {
  const markerIndex = existingHtaccess.indexOf(LEGACY_MARKER);
  if (markerIndex === -1) {
    throw new Error(`Could not find "${LEGACY_MARKER}" in ${HTACCESS_PATH}`);
  }
  return existingHtaccess.slice(markerIndex).trimEnd();
}

export function buildHtaccess(existingHtaccess = fs.readFileSync(HTACCESS_PATH, 'utf8')) {
  return [
    'Options -Indexes',
    'RewriteEngine On',
    '',
    buildShortLinkRules(),
    '',
    legacyRedirectBlock(existingHtaccess),
    '',
  ].join('\n');
}

function docQuery(params) {
  return query(params)
    .replaceAll('$1', '<locale>')
    .replaceAll('$2', '<event>')
    .replaceAll('$3', '<campaign>');
}

function docDestination(group, variant) {
  if (group.kind === 'event') {
    if (variant === 'base') {
      const hash = baseHash(group);
      return `/<locale>/?${docQuery({ lang: '<booking-lang>', ...baseEventParams(group) })}${hash ? `#${hash}` : ''}`;
    }
    if (variant === 'section') {
      return `/<locale>/?${docQuery({ lang: '<booking-lang>', ...sectionParams(group, '<section>') })}#<section>`;
    }
    if (variant === 'section-campaign') {
      return `/<locale>/?${docQuery({ lang: '<booking-lang>', ...sectionParams(group, '<section>', '<campaign>') })}#<section>`;
    }
    if (variant === 'event-campaign') {
      return `/<locale>/events/<event>/?${docQuery({ lang: '<booking-lang>', ...eventParams(group, '<event>', '<campaign>') })}`;
    }
    return `/<locale>/events/<event>/?${docQuery({ lang: '<booking-lang>', ...eventParams(group, '<event>') })}`;
  }

  if (group.kind === 'booking') {
    if (variant === 'base') {
      return `/<locale>/?${docQuery({ openBooking: '1', lang: '<booking-lang>', ...withoutOpenBooking(bookingBaseParams(group)) })}`;
    }
    if (variant === 'event-campaign') {
      return `/<locale>/events/<event>/?${docQuery({ openBooking: '1', lang: '<booking-lang>', ...withoutOpenBooking(bookingCampaignParams(group, '<campaign>')) })}`;
    }
    return `/<locale>/?${docQuery({ openBooking: '1', lang: '<booking-lang>', ...withoutOpenBooking(bookingCampaignParams(group, '<campaign>')) })}`;
  }

  if (variant === 'base') {
    return `/<locale>/?${docQuery({ openBooking: '1', lang: '<booking-lang>', ...withoutOpenBooking(leadBaseParams(group)) })}`;
  }
  if (variant === 'event-campaign') {
    return `/<locale>/events/<event>/?${docQuery({ openBooking: '1', lang: '<booking-lang>', ...withoutOpenBooking(leadBaseParams(group, '<campaign>')) })}`;
  }
  return `/<locale>/?${docQuery({ openBooking: '1', lang: '<booking-lang>', ...withoutOpenBooking(leadBaseParams(group, '<campaign>')) })}`;
}

function docPageDestination(group, page, campaign = page.campaign) {
  return `/<locale>/${page.path}/?${docQuery({ lang: '<booking-lang>', ...pageParams(group, page, campaign) })}`;
}

function withoutOpenBooking(params) {
  const { openBooking, ...rest } = params;
  return rest;
}

function docRows() {
  const rows = [];
  shortLinkGroups.forEach((group) => {
    rows.push([`/${group.prefix}[/<locale>]`, docDestination(group, 'base')]);
    if (group.kind === 'event') {
      if (group.sectionLinks) {
        rows.push([`/${group.prefix}[/<locale>]/<section>`, docDestination(group, 'section')]);
        rows.push([`/${group.prefix}[/<locale>]/<section>/<campaign>`, docDestination(group, 'section-campaign')]);
      }
      if (group.pageLinks) {
        group.pageLinks.forEach((page) => {
          rows.push([`/${group.prefix}[/<locale>]/${page.slug}`, docPageDestination(group, page)]);
          rows.push([`/${group.prefix}[/<locale>]/${page.slug}/<campaign>`, docPageDestination(group, page, '<campaign>')]);
        });
      }
      rows.push([`/${group.prefix}[/<locale>]/<event>`, docDestination(group, 'event')]);
      if (group.campaignOverride) {
        rows.push([`/${group.prefix}[/<locale>]/<event>/<campaign>`, docDestination(group, 'event-campaign')]);
        if (group.localePrefixAliases) {
          rows.push([`/<locale>/${group.prefix}/<event>/<campaign>`, docDestination(group, 'event-campaign')]);
        }
      }
    } else {
      rows.push([`/${group.prefix}[/<locale>]/<campaign>`, docDestination(group, 'campaign')]);
      rows.push([`/${group.prefix}[/<locale>]/<event>/<campaign>`, docDestination(group, 'event-campaign')]);
    }
  });
  return rows;
}

export function buildShortLinksDoc() {
  const table = docRows()
    .map(([source, destination]) => `| \`${source}\` | \`${destination}\` |`)
    .join('\n');

  return `# Short marketing links

This file is generated by \`scripts/generate-short-links.mjs\` from
\`scripts/short-links.config.mjs\`. Edit the config and rerun
\`npm run generate:short-links\` instead of editing the generated redirect table
by hand.

These links are implemented in \`public/.htaccess\` and deploy with the static
Plesk build. They intentionally use \`302\` redirects because campaign
destinations may change. Existing query parameters are appended to the
destination, so platform click IDs such as \`fbclid\` and \`ttclid\` are
preserved. Google Ads click IDs such as \`gclid\`, \`gbraid\`, and \`wbraid\`
are preserved the same way.

Language can be added after the short link:

\`\`\`text
https://vivien.lv/ig/lv
https://vivien.lv/ig-book/ru
https://vivien.lv/ig-book/ru/cherry-days/meta_cherry_days_july
https://vivien.lv/e/ru/cherry-days
https://vivien.lv/poster/ru/cherry-days
https://vivien.lv/ig/ru/cherry-days
https://vivien.lv/ig/ru/menu
https://vivien.lv/meta-event/ru/cherry-days/meta_cherry_days_july
https://vivien.lv/meta-book/ru/cherry-days/meta_cherry_days_july
https://vivien.lv/ig-book/ru/cherry-days/ig_cherry_days_july
https://vivien.lv/google/ru/events/google_cherry_days_july
https://vivien.lv/google/ru/gift-card/google_gift_card_july
https://vivien.lv/google/ru/cherry-days/google_cherry_days_july
https://vivien.lv/google-book/ru/cherry-days/google_cherry_days_july
\`\`\`

Supported site-language segments are \`en\`, \`lv\`, \`fr\`, and \`ru\`.
Missing or unknown language segments redirect to \`/en/\` with \`lang=en\`.
French URLs redirect to \`/fr/\` with \`lang=en\`, because the Restoplace
booking form currently supports English, Latvian, and Russian.

Campaign and event placeholders use a path segment. Campaign slugs should use
letters, numbers, dots, underscores, hyphens, or tildes.

Section links use the visible page section id as a path segment. Supported
section slugs are \`${sectionSlugs.join('`, `')}\`.

Manager-facing formats:

\`\`\`text
Event landing page: https://vivien.lv/<channel>/<locale>/<event>
Menu section:       https://vivien.lv/<channel>/<locale>/menu
Booking modal:      https://vivien.lv/<channel>-book/<locale>
Event + booking:    https://vivien.lv/<channel>-book/<locale>/<event>/<campaign>
\`\`\`

Google page links currently support \`gift-card\`.

Event links use the event \`id\` from \`src/content/site.js\`, for example
\`cherry-days\`. A concrete event link redirects to a static event landing page
such as \`/ru/events/cherry-days/\`, so Meta can scrape event-specific Open
Graph tags. Browser users are then sent to \`#events\`, the event is selected in
the carousel, and event carousel autoplay pauses for that page view. These event
landing pages are \`noindex\` and intentionally omitted from \`sitemap.xml\`.

Poster QR links use \`/poster[/<locale>]/<event>\` for printed event posters.
They keep the event-specific landing page while separating offline poster
traffic through \`utm_source=poster\`, \`utm_medium=offline\`, and
\`utm_content=qr_code\`.

Meta paid-social event links support both canonical short-link order and a
locale-prefixed compatibility alias:

\`\`\`text
https://vivien.lv/meta-event/cherry-days/meta_cherry_days_july
https://vivien.lv/meta-event/ru/cherry-days/meta_cherry_days_july
https://vivien.lv/ru/meta-event/cherry-days/meta_cherry_days_july
https://vivien.lv/lv/meta-event/cherry-days/meta_cherry_days_july
\`\`\`

Organic social booking links use \`/x-book[/<locale>]\`,
\`/ig-book[/<locale>]\`, \`/fb-book[/<locale>]\`, or \`/tt-book[/<locale>]\`.
Add a campaign slug after the optional locale when the booking link needs a
specific analytics campaign, for example \`/ig-book/ru/meta_cherry_days_july\`.
These links open the booking form with \`openBooking=1\`. For Meta previews that
must show a specific event, include the event before the campaign:
\`/ig-book/ru/cherry-days/meta_cherry_days_july\`.

X links keep the public \`/x\` and \`/x-book\` short-link prefixes, but redirect
with \`utm_source=twitter\` and \`utm_medium=social\`. This keeps GA4 organic
social attribution stable after X wraps public links with \`t.co\`.

Google Ads links use \`utm_source=google\` and \`utm_medium=cpc\` for GA4-friendly
paid Google attribution. Use \`/google[/<locale>]/<section>/<campaign>\` for a
page section, \`/google[/<locale>]/gift-card/<campaign>\` for the gift card page,
\`/google[/<locale>]/<event>/<campaign>\` for an event landing page, and
\`/google-book[/<locale>]/<event>/<campaign>\` when the ad should open booking.

Lead-form links use \`/<prefix>[/<locale>]/<campaign>\` and also support the base
path without a campaign segment, using \`utm_campaign=lead_form\`.

| Short URL | Destination |
| --- | --- |
${table}
`;
}

export function generatedRewriteRuleLines(htaccessText = buildHtaccess()) {
  return htaccessText
    .split('\n')
    .filter((line) => line.startsWith('RewriteRule '));
}

export function resolveRedirect(input, htaccessText = buildHtaccess()) {
  const url = new URL(input, siteOrigin);
  const pathForRules = url.pathname.replace(/^\//, '');

  for (const line of generatedRewriteRuleLines(htaccessText)) {
    const match = line.match(/^RewriteRule \^(.+)\$ (.+) \[R=302,L,NE,QSA\]$/);
    if (!match) continue;

    const [, pattern, destination] = match;
    const pathMatch = pathForRules.match(new RegExp(`^${pattern}$`));
    if (!pathMatch) continue;

    let location = destination;
    pathMatch.slice(1).forEach((value, index) => {
      location = location.replaceAll(`$${index + 1}`, value);
    });

    if (url.search) {
      const hashIndex = location.indexOf('#');
      const beforeHash = hashIndex === -1 ? location : location.slice(0, hashIndex);
      const hash = hashIndex === -1 ? '' : location.slice(hashIndex);
      location = `${beforeHash}${beforeHash.includes('?') ? '&' : '?'}${url.search.slice(1)}${hash}`;
    }

    return location.startsWith('http') ? location : `${siteOrigin}${location}`;
  }

  return null;
}

export { redirectFixtures };

function writeIfChanged(filePath, content) {
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (previous === content) return false;
  fs.writeFileSync(filePath, content);
  return true;
}

export function generateShortLinkFiles() {
  const htaccessChanged = writeIfChanged(HTACCESS_PATH, buildHtaccess());
  const docsChanged = writeIfChanged(DOC_PATH, buildShortLinksDoc());
  return { htaccessChanged, docsChanged };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const result = generateShortLinkFiles();
  console.log(JSON.stringify(result));
}
