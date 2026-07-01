# Vivien site-v2 migration map

This rebuild is isolated under `site-v2/`. Legacy root files are intentionally left untouched until production launch.

## Migrated

- Homepages: `/en/`, `/lv/`, `/fr/`, `/ru/`
- Booking campaign route: `/book/`
- Gift card pages and thanks pages
- Review funnel pages
- Loyalty registration pages
- Waiter job pages in EN/LV/FR/RU
- Maitre d'hotel job page in EN only
- First-party legal pages for terms, privacy, public offer, personal-data consent and cookie policy
- Contact, newsletter, gift card, review, loyalty and job forms
- Restaurant JSON-LD, canonical, OpenGraph and hreflang metadata
- Sitemap with localized alternates
- A3 menu cache rendered into initial HTML
- Gallery cache with ImageKit hook and local image fallback

## Redirect-only after launch

Use `deploy/legacy-redirects.htaccess` only after staging QA passes and the new production files have been deployed.

## Archived until explicit approval

- `coming-soon-*.html`
- `starter-page.html`
- `index_old.html`
- legacy duplicated locale HTML files after production stability period

## External verification still required

- CookieYes Basic site ID and production scan
- GTM Preview with Consent Mode v2
- Restoplace PRO+ event mapping and `reserve_success` verification
- SMTP/Plesk environment variables and one successful email test per form per locale
- ImageKit folder credentials and final gallery scan
- Legal translation review for non-source languages
