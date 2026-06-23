# Ticket: SEO-first i18n rebuild for vivien.lv

## Executor

This ticket is written for iterative implementation with Codex 5.5 Extra High.

The work should be done in small, verifiable steps. Do not replace the production site until the staging build has passed the rollout checklist.

## Goal

Rebuild `vivien.lv` as a mobile-first, SEO-indexable multilingual website while preserving:

- the current Vivien visual identity;
- the existing menu source from A3 / scheduled visit widget API;
- the existing Restoplace booking flow;
- all current business flows: booking, gift cards, reviews, loyalty card registration, and job descriptions.

The new site must improve:

- indexability;
- multilingual SEO;
- advertising attribution;
- one-tap booking UX;
- gallery freshness through ImageKit;
- maintainability by replacing duplicated locale HTML files with one shared i18n codebase.

## Confirmed Paid/External Components

Use these assumptions:

- CookieYes Basic will be used for EEA/GDPR consent and Google Consent Mode v2.
- ImageKit is already available through A3. A3 will provide a folder for `vivien.lv` assets.
- Restoplace PRO+ is already available for `vivien.lv`.
- Current Plesk hosting remains in use.
- DNS management is not available in hosting panel. DNS changes require support and may be delayed.

## Key Decisions

- Do not send ad traffic directly to `https://vivien.restoplace.ws/`.
- All primary booking CTAs must start from first-party Vivien URLs or first-party Vivien buttons.
- Booking must stay one tap:
  - homepage visitor taps `Book a Table` once and Restoplace modal opens immediately;
  - ad visitor taps banner once and lands on `vivien.lv` with Restoplace modal opened automatically.
- Successful booking conversion must be counted from Restoplace `reserve_success` or webhook, not only from CTA click.
- Build staging inside the existing `vivien.lv` domain, not on `staging.vivien.lv`, because DNS cannot be changed immediately.

## Current Site Inventory

The existing site includes these page families:

- homepage:
  - `index.html`
  - `index-lv.html`
  - `index-fr.html`
  - `index-ru.html`
- gift card:
  - `gift-card/giftcard-en.html`
  - `gift-card/giftcard-lv.html`
  - `gift-card/giftcard-fr.html`
  - `gift-card/giftcard-ru.html`
  - gift card thanks pages
  - language chooser page
- review funnel:
  - `review_en.html`
  - `review_lv.html`
  - `review_fr.html`
  - `review_ru.html`
- loyalty registration:
  - `new-loyal-registration-en.html`
  - `new-loyal-registration-lv.html`
  - `new-loyal-registration-fr.html`
  - `new-loyal-registration-ru.html`
  - `new-loyal.html`
- job descriptions:
  - `JD-Waiter.html`
  - `JD-Waiter-lv.html`
  - `JD-Waiter-fr.html`
  - `JD-Waiter-ru.html`
  - `JD-Maitre-d-hotel.html`
- temporary/legacy pages:
  - `coming-soon-*.html`
  - `starter-page.html`
  - `index_old.html`
- external Restoplace legal/policy source pages:
  - terms of use: `https://vivien.restoplace.ws/form/stipulation/?address=5a003b0dc90935f47c87`
  - privacy policy: `https://vivien.restoplace.ws/form/politics/?address=5a003b0dc90935f47c87`
  - public offer: `https://vivien.restoplace.ws/form/offer/?address=5a003b0dc90935f47c87`
  - personal data processing consent: `https://vivien.restoplace.ws/form/personaldata/?address=5a003b0dc90935f47c87`

During migration, each page must be classified as:

- migrate;
- redirect;
- archive;
- remove only after explicit approval.

## Project Isolation Strategy

Build the new site as an isolated project inside this same repository, not by editing the legacy root HTML files in place.

Recommended structure:

```text
/
  index.html                         # legacy production site, read-only during rebuild
  index-lv.html                      # legacy production site
  assets/                            # legacy assets, source for migration
  forms/                             # legacy PHP form handlers, source for migration
  api/                               # legacy/current PHP API files, source for audit
  gift-card/                         # legacy pages
  site-v2/                           # new isolated project
    package.json
    astro.config.mjs
    src/
    public/
    scripts/
    dist/                            # generated output, never edited manually
```

Rules:

- legacy root files remain untouched except for explicit redirect/launch work;
- new source code lives under `site-v2/`;
- new build output lives under `site-v2/dist/`;
- staging deploy copies only `site-v2/dist/` into `https://vivien.lv/_staging/v2/`;
- production deploy copies only `site-v2/dist/` into `httpdocs`;
- new production pages must not depend at runtime on old root files;
- if an old asset/form/API is still needed, copy or migrate it into `site-v2/public/` or a documented server endpoint.

Codex should use the existing root files as read-only source material:

- read current HTML/CSS/JS/PHP from the repo root;
- extract required content, layout, styles, images, form behavior, and scripts;
- migrate only the needed pieces into `site-v2`;
- document anything intentionally left behind.

Do not depend on symlinks for deployment, because Plesk behavior may differ between staging and production.

Preferred migration pattern:

- content and translations -> `site-v2/src/content/` or `site-v2/src/i18n/`;
- components/layouts -> `site-v2/src/components/` and `site-v2/src/layouts/`;
- browser JS -> `site-v2/src/scripts/` or bundled Astro/Vite entry points;
- static public assets -> `site-v2/public/`;
- server/PHP endpoints that must remain public -> `site-v2/public/api/` or `site-v2/public/forms/`, unless replaced by a better endpoint.

After launch, old root files can be removed safely only after:

- the new production site has been stable for at least 2 weeks;
- redirects have been verified;
- no production page references old root paths;
- Plesk access logs do not show important missing legacy URLs;
- a full backup and git tag exist.

## Target Architecture

Use Astro static site generation or equivalent SEO-first static build.

Deploy generated static files to Plesk `httpdocs` only after staging verification.

Keep lightweight server/PHP/Node endpoints only for cached integrations:

- menu pre-render/cache;
- ImageKit gallery cache;
- Restoplace webhook receiver;
- existing form handling or replacement endpoints.

Preserve current visual language:

- dark brasserie atmosphere;
- Vivien typography and logo treatment;
- gold accents;
- current hero mood;
- menu layout;
- gallery/lightbox behavior;
- mobile-first CTA hierarchy.

## Target Routes

Use clean localized routes.

Homepage:

- `/en/`
- `/lv/`
- `/fr/`
- `/ru/`

Booking campaign route:

- `/book/`

Gift card:

- `/en/gift-card/`
- `/lv/gift-card/`
- `/fr/gift-card/`
- `/ru/gift-card/`
- `/en/gift-card/thanks/`
- `/lv/gift-card/thanks/`
- `/fr/gift-card/thanks/`
- `/ru/gift-card/thanks/`

Review funnel:

- `/en/review/`
- `/lv/review/`
- `/fr/review/`
- `/ru/review/`

Loyalty registration:

- `/en/loyalty/`
- `/lv/loyalty/`
- `/fr/loyalty/`
- `/ru/loyalty/`

Jobs:

- `/en/jobs/waiter/`
- `/lv/jobs/waiter/`
- `/fr/jobs/waiter/`
- `/ru/jobs/waiter/`
- `/en/jobs/maitre-d-hotel/`

If localized content for a job page is missing, either:

- create the missing translation before launch; or
- canonicalize/redirect to the English page with clear approval.

Legal and policy pages:

- `/en/terms/`
- `/lv/terms/`
- `/fr/terms/`
- `/ru/terms/`
- `/en/privacy/`
- `/lv/privacy/`
- `/fr/privacy/`
- `/ru/privacy/`
- `/en/public-offer/`
- `/lv/public-offer/`
- `/fr/public-offer/`
- `/ru/public-offer/`
- `/en/personal-data-consent/`
- `/lv/personal-data-consent/`
- `/fr/personal-data-consent/`
- `/ru/personal-data-consent/`
- `/en/cookie-policy/`
- `/lv/cookie-policy/`
- `/fr/cookie-policy/`
- `/ru/cookie-policy/`

If legal translations are not ready, do not silently launch incomplete policy pages. Use approved fallback language and clearly document it.

## Old URL Redirects

Prepare 301 redirects from old URLs to new routes.

Homepage:

- `/index.html` -> `/en/`
- `/index-lv.html` -> `/lv/`
- `/index-fr.html` -> `/fr/`
- `/index-ru.html` -> `/ru/`

Gift card:

- `/gift-card/giftcard-en.html` -> `/en/gift-card/`
- `/gift-card/giftcard-lv.html` -> `/lv/gift-card/`
- `/gift-card/giftcard-fr.html` -> `/fr/gift-card/`
- `/gift-card/giftcard-ru.html` -> `/ru/gift-card/`
- `/gift-card/giftcard-thanks-en.html` -> `/en/gift-card/thanks/`
- `/gift-card/giftcard-thanks-lv.html` -> `/lv/gift-card/thanks/`
- `/gift-card/giftcard-thanks-fr.html` -> `/fr/gift-card/thanks/`
- `/gift-card/giftcard-thanks-ru.html` -> `/ru/gift-card/thanks/`

Reviews:

- `/review_en.html` -> `/en/review/`
- `/review_lv.html` -> `/lv/review/`
- `/review_fr.html` -> `/fr/review/`
- `/review_ru.html` -> `/ru/review/`

Loyalty:

- `/new-loyal-registration-en.html` -> `/en/loyalty/`
- `/new-loyal-registration-lv.html` -> `/lv/loyalty/`
- `/new-loyal-registration-fr.html` -> `/fr/loyalty/`
- `/new-loyal-registration-ru.html` -> `/ru/loyalty/`
- `/new-loyal.html` -> `/en/loyalty/`

Jobs:

- `/JD-Waiter.html` -> `/en/jobs/waiter/`
- `/JD-Waiter-lv.html` -> `/lv/jobs/waiter/`
- `/JD-Waiter-fr.html` -> `/fr/jobs/waiter/`
- `/JD-Waiter-ru.html` -> `/ru/jobs/waiter/`
- `/JD-Maitre-d-hotel.html` -> `/en/jobs/maitre-d-hotel/`

Do not deploy redirects before the replacement pages exist and are tested.

## Staging Plan Inside vivien.lv

Because DNS changes are delayed, staging must be created inside the existing domain.

Preferred staging URL:

- `https://vivien.lv/_staging/v2/`

Staging requirements:

- protect with Plesk password-protected directory if possible;
- add `noindex, nofollow` meta robots;
- add `X-Robots-Tag: noindex, nofollow` if server configuration allows;
- do not include staging URLs in production sitemap;
- do not connect staging to production ad campaigns;
- use test/debug GTM mode where possible;
- clearly show a small internal-only staging marker in the footer or top corner.

Staging deployment must be self-contained:

- build from `site-v2`;
- upload/copy `site-v2/dist/` to `https://vivien.lv/_staging/v2/`;
- verify that staging pages do not load CSS/JS/images from old root paths unless those files have been deliberately migrated and will exist after production launch.

If password protection breaks API testing, use `noindex` plus a hard-to-guess staging path temporarily.

## Booking UX

Implement a single booking function used everywhere:

```js
openBooking({
  source: 'home_hero' | 'header_cta' | 'book_auto' | 'menu_cta' | 'fallback',
  auto: true | false
})
```

Homepage buttons:

- no navigation to `/book/`;
- one tap opens Restoplace modal immediately;
- push `booking_intent` to `dataLayer`.

Ad traffic:

- primary campaign URL example:

```text
https://vivien.lv/book/?openBooking=1&utm_source=meta&utm_medium=paid_social&utm_campaign=summer_booking
```

- page view is tracked on `vivien.lv`;
- after page load and consent initialization, automatically call:

```js
openBooking({ source: 'book_auto', auto: true })
```

- modal opens without a second tap.

Restoplace trigger:

- If Restoplace requires the existing trigger, keep it as a hidden technical trigger:

```html
<div id="restoplace-btn" class="restoplace-click-open" hidden></div>
```

- Public buttons must be semantic:

```html
<button type="button" class="js-booking-trigger" data-booking-source="home_hero">
  Book a Table
</button>
```

- Public button calls the hidden Restoplace trigger programmatically.
- If Restoplace supports binding directly to `<button class="restoplace-click-open">`, use the semantic button directly.

Fallback:

- If modal does not open within a timeout, show a small fallback button: `Open booking page`.
- Fallback may redirect to `https://vivien.restoplace.ws/`, but only after first-party tracking has fired.
- Do not use Restoplace URL as a primary campaign URL.

## Analytics And Conversions

Replace direct hardcoded `gtag` calls with CookieYes Basic + GTM + Google Consent Mode v2.

CookieYes:

- use CookieYes Basic;
- configure EEA/GDPR consent categories;
- integrate Google Consent Mode v2;
- block non-essential marketing tags until consent;
- verify with GTM Preview and browser devtools.

DataLayer events:

- `booking_intent`
- `restoplace_widget_open`
- `reserve_submit_click`
- `reserve_success`
- `prepare_table_click`
- `gift_card_start`
- `gift_card_submit`
- `review_positive`
- `review_negative`
- `loyalty_registration_submit`
- `job_application_submit`
- `contact_submit`

Each booking event should include:

- `booking_source`;
- `event_id`;
- `page_location`;
- UTM params if present;
- `gclid`, `gbraid`, `wbraid`, `fbclid` if present.

Restoplace PRO+:

- configure Restoplace analytics for GA/Fb Pixel/TikTok where available;
- use Restoplace events:
  - `open_widget`;
  - `btn_reserve_send`;
  - `reserve_success`;
- add HTTPS webhook endpoint for reservation events if feasible.

Optional server-side conversion:

- handle `reserve.created` and `reserve.updated`;
- deduplicate by reservation ID/event ID;
- send server-side conversions only after consent/legal review;
- log failures without breaking user booking.

## SEO Requirements

Use one shared i18n codebase, not duplicated per-locale HTML.

Every localized page must have:

- localized `<html lang>`;
- localized title;
- localized meta description;
- canonical URL;
- full bidirectional `hreflang`;
- `x-default` where relevant;
- OpenGraph metadata;
- structured data when relevant.

Generate sitemap with localized URLs and hreflang alternates.

Add JSON-LD `Restaurant` / `LocalBusiness` to homepage routes:

- name;
- address;
- phone;
- opening hours;
- cuisine;
- images;
- menu URL;
- booking URL;
- sameAs links.

For gift card pages, add relevant product/service structured data only if content quality is sufficient.

For job pages, ensure they are either:

- proper public recruiting pages with complete content; or
- `noindex` if they are not intended for search.

## Legal And Policy Pages

Create first-party legal/policy pages on `vivien.lv`. Do not keep these documents only as links to `vivien.restoplace.ws`.

Source documents:

- terms of use: `https://vivien.restoplace.ws/form/stipulation/?address=5a003b0dc90935f47c87`;
- privacy policy: `https://vivien.restoplace.ws/form/politics/?address=5a003b0dc90935f47c87`;
- public offer: `https://vivien.restoplace.ws/form/offer/?address=5a003b0dc90935f47c87`;
- personal data processing consent: `https://vivien.restoplace.ws/form/personaldata/?address=5a003b0dc90935f47c87`.

Requirements:

- copy the source text and legal data into first-party content files under `site-v2`;
- preserve SIA legal details exactly as shown in the source documents unless corrected by the owner;
- store a source snapshot date in the content metadata;
- create localized pages for EN/LV/FR/RU;
- use one shared legal page layout;
- include canonical and hreflang metadata;
- link legal pages from the footer;
- link the relevant policy/consent pages from every form that collects personal data;
- link terms/public offer from gift card and payment-related flows;
- link privacy/personal data consent from review, loyalty, contact, newsletter, and job flows.

Cookie Policy:

- create standalone `/[locale]/cookie-policy/` pages if CookieYes does not generate acceptable first-party policy pages;
- derive the Cookie Policy from:
  - existing privacy/legal documents;
  - CookieYes cookie scan;
  - actual tags/scripts used by the new site;
  - CookieYes consent categories;
- include a link or button to reopen CookieYes preferences.

Legal review:

- do not materially rewrite legal meaning during migration;
- translations should be reviewed before production launch;
- if only one source language is legally authoritative, state that clearly on translated pages.

## Menu

Preserve current menu source:

- endpoint: `https://app.a3-as.com/api/guest/scheduled-visits/widget/bootstrap`;
- merchant: `vivien-riga`;
- locales: `en`, `lv`, `fr`, `ru`.

Fetch menu during build or scheduled cache refresh.

Render menu categories and items into initial HTML.

Keep JS filtering/modal descriptions as progressive enhancement.

Current legacy `api/menu_api.php` must be audited:

- keep only if still used;
- otherwise remove after migration or mark as fallback.

## Gallery

Use ImageKit as the source of fresh gallery assets.

Assumption:

- A3 provides an ImageKit folder for `vivien.lv`.

Requirements:

- server-side job/API reads configured ImageKit folder;
- private ImageKit keys must never be exposed to browser;
- cache normalized gallery data as JSON;
- render optimized responsive images with:
  - width/height;
  - alt text;
  - captions where available;
  - lazy loading below first viewport;
- fallback to current local gallery images if ImageKit is unavailable.

## Instagram

Do not make Instagram the primary SEO gallery source.

Use Instagram posts/reels only as optional social proof.

Load embeds lazily and only after consent if they set tracking cookies.

Best stories/reels should be manually or automatically mirrored into ImageKit as durable assets.

## Forms And Business Flows

Preserve or replace current form flows:

- contact form;
- newsletter form;
- gift card purchase/request form;
- review funnel form;
- loyalty card registration form;
- job application form.

Email delivery is mandatory. The rebuild is not accepted if forms look correct but do not send emails.

Current email destinations to preserve unless explicitly changed:

- contact -> `new_contact@brivibas.planfix.com`;
- newsletter -> `subscribe@brivibas.planfix.com`;
- gift card -> `gift-cards@brivibas.planfix.com`;
- private/negative review feedback -> `feedback@brivibas.planfix.com`;
- loyalty registration -> `new_loyal@brivibas.planfix.com`;
- job application -> `new-job-application@brivibas.planfix.com`.

Current implementation uses a mix of:

- BootstrapMade `PHP_Email_Form`;
- SendPulse SMTP API;
- PHP endpoints under `forms/`.

The new site may either:

- keep migrated PHP endpoints under `site-v2/public/forms/`; or
- replace them with better server endpoints;

but the external behavior must remain compatible with the frontend forms and email recipients.

For each form:

- preserve localized labels and success/error messages;
- add spam protection if missing;
- send `dataLayer` success event after confirmed server success, not before;
- avoid exposing SMTP/API credentials in frontend code;
- provide visible error state if submission fails.
- return the response format expected by the frontend validator, usually `OK` for success;
- validate required fields server-side;
- sanitize all user-provided content in email HTML;
- support attachments where the current business flow supports attachments;
- log server-side failures without exposing secrets to users.

Credential handling:

- do not hardcode SendPulse/API/SMTP secrets in new source files;
- move secrets to environment variables or Plesk server configuration;
- document required environment variables in `site-v2/.env.example`;
- never commit real secrets to git.

Required form test matrix before launch:

- submit one successful test per locale for each form family;
- verify email arrives in the correct Planfix mailbox;
- verify the email includes language, source page, and submitted fields;
- verify invalid submissions show localized errors;
- verify `dataLayer` success event fires only after server success;
- verify failed server response does not fire success event.

## Implementation Workflow For Codex

Work in phases. After each phase:

- run available build/lint/test checks;
- inspect generated HTML;
- verify changed pages manually;
- commit only intentionally if requested.

Recommended phases:

1. Inventory and migration map.
2. Create isolated `site-v2/` project scaffold.
3. Copy/migrate only required legacy assets into `site-v2/public/`.
4. i18n routing and shared layout.
5. Homepage migration.
6. Menu pre-render.
7. One-tap booking flow.
8. CookieYes + GTM + consent events.
9. Gift card pages.
10. Review funnel pages.
11. Loyalty registration pages.
12. Job pages.
13. Legal and policy pages.
14. ImageKit gallery.
15. Sitemap, robots, redirects.
16. Staging deploy under `/_staging/v2/`.
17. Production launch package.
18. Legacy cleanup plan after 2+ weeks of stable production.

Do not attempt all phases in one large edit.

## Hosting And Deployment

Keep current Plesk hosting if static build works cleanly.

Use Plesk Git/Node/PHP capabilities as needed.

Ensure SSL is active for:

- `vivien.lv`;
- `api.vivien.lv`, if used.

Because DNS management is unavailable:

- do not depend on `staging.vivien.lv` for MVP rollout;
- use `vivien.lv/_staging/v2/`;
- ask hosting support later about DNS if a real staging subdomain is desired.

If Restoplace supports white-label/CNAME, ask support later about `booking.vivien.lv`.

Do not reverse-proxy Restoplace unless Restoplace explicitly supports it.

## Rollout Plan For Non-Developer Owner

1. Create full Plesk backup.
2. Create git tag: `production-before-rebuild`.
3. Keep legacy files in root as the current production source.
4. Build the new project inside `site-v2/`.
5. Create staging directory: `https://vivien.lv/_staging/v2/`.
6. Protect staging from indexing with password protection or `noindex`.
7. Deploy only `site-v2/dist/` to staging.
8. Test staging on mobile and desktop.
9. Verify:
   - localized pages;
   - menu visible in page source;
   - booking opens in one tap from homepage;
   - `/book/?openBooking=1` auto-opens modal;
   - CookieYes banner appears and controls tags;
   - GTM Preview events;
   - Restoplace success event;
   - forms;
   - legal and policy pages;
   - legal links from footer and forms;
   - ImageKit fallback;
   - sitemap;
   - canonical/hreflang;
   - structured data.
10. Prepare 301 redirects for old URLs.
11. Do not launch if any core flow fails:
   - homepage;
   - menu;
   - booking;
   - gift card;
   - review;
   - loyalty registration;
   - legal/policy pages;
   - contact.
12. Launch by swapping `httpdocs`:
    - rename current `httpdocs` to `httpdocs_old_YYYYMMDD`;
    - deploy `site-v2/dist/` to `httpdocs`.
13. Immediately smoke-test production.
14. If a critical issue appears, rollback by restoring old `httpdocs`.
15. Monitor for 48 hours:
    - GA4/GTM;
    - CookieYes consent logs/settings;
    - Restoplace analytics;
    - Search Console;
    - Plesk logs;
    - 404s;
    - form submissions.
16. Keep old site backup for at least 2 weeks.
17. After 2+ stable weeks, remove legacy files only from the deployed production directory, not from git history.

## Acceptance Criteria

- Homepage booking opens Restoplace modal in one tap.
- Ad URL `/book/?openBooking=1...` opens booking modal without a second tap.
- No primary ad campaign URL points to `vivien.restoplace.ws`.
- CookieYes Basic is installed and Google Consent Mode v2 is configured.
- `booking_intent` is tracked on Vivien domain.
- Real booking success is tracked via Restoplace `reserve_success` or webhook.
- Menu content exists in initial HTML source.
- EN/LV/FR/RU homepage pages have correct canonical and hreflang.
- Gift card, review, loyalty, and job pages are included in the new route map.
- Terms, privacy policy, public offer, personal data consent, and cookie policy pages exist as first-party localized `vivien.lv` pages.
- Footer and personal-data forms link to the relevant legal/policy pages.
- All migrated forms send email successfully to the intended Planfix mailbox.
- No real SendPulse/API/SMTP secrets are committed to the repository.
- Form success analytics events fire only after confirmed server success.
- Old URLs redirect to correct new URLs.
- Sitemap is updated.
- Restaurant JSON-LD validates.
- Gallery updates from A3-provided ImageKit folder or falls back gracefully.
- Staging works under `vivien.lv/_staging/v2/`.
- New source is isolated under `site-v2/`.
- Production deploy can be made from `site-v2/dist/` without legacy root files.
- Production rollback is possible within minutes.

## Out Of Scope

- Full visual redesign.
- Replacing Restoplace.
- Reverse-proxying Restoplace without vendor support.
- Using Instagram Stories as the main gallery source.
- Exposing private API keys in frontend code.
- Waiting for DNS support before creating staging.
