# Staging deploy

Preferred staging URL:

```text
https://vivien.lv/_staging/v2/
```

Build:

```sh
nvm install
nvm use
npm install
npm run fetch:legal
npm run fetch:menu
npm run build:staging
```

Astro 7 is used because current npm advisories flag older Astro versions. Node `>=22.12.0` is required and pinned in `.nvmrc`.

Upload only `site-v2/dist/` into `httpdocs/_staging/v2/`.

If Plesk allows directory-level Apache config, also place `deploy/staging.htaccess` into `httpdocs/_staging/v2/.htaccess` or configure the same `X-Robots-Tag: noindex, nofollow` header in the panel.

Staging must not be used for ad traffic. The build includes a visible internal staging marker when `PUBLIC_VIVIEN_BUILD_TARGET=staging` is set.

## Plesk production zips

There are now two separate Plesk deployables:

- the static website in `site-v2/`, deployed to `vivien.lv`
- the gift-card checkout API in `php-api/`, deployed to `api.vivien.lv`

Create the website zip from a fresh build:

```sh
./site-v2/scripts/build-plesk-zip.sh
```

The script uses Node from `site-v2/.nvmrc`, installs it through `nvm` if needed,
refreshes menu/gallery caches through the normal `npm run build` prebuild, and
writes a zip to `site-v2/build-artifacts/`. The archive contains the contents of
`site-v2/dist/` at the zip root, ready to extract into the target Plesk document
root.

Create the API zip separately:

```sh
./php-api/scripts/build-plesk-zip.sh
```

Extract that archive into the `api.vivien.lv` subscription root, with Plesk document
root set to `public/`. Run Composer Install in Plesk there, create a private `.env`
from the API `.env.example`, import the SQL migrations, and confirm
`https://api.vivien.lv/health`.

The root `.env.example` belongs to the preserved Python reference implementation and
is not used by the Plesk production website or PHP API.

## Form and email testing

The local static preview used for UI checks, for example `python3 -m http.server`, cannot execute PHP form handlers. A POST to `/forms/*.php` on that server returns `501 Unsupported method`, so it is not an SMTP credential test.

Real form testing requires a PHP runtime with `site-v2/public/forms/` deployed and the SMTP/Plesk environment variables below configured. On a local machine with PHP installed, test from the same document root that contains `/_staging/v2/`:

```sh
VIVIEN_SMTP_HOST=... \
VIVIEN_SMTP_PORT=587 \
VIVIEN_SMTP_USER=... \
VIVIEN_SMTP_PASS=... \
VIVIEN_SMTP_SECURE=tls \
VIVIEN_MAIL_FROM=noreply@vivien.lv \
VIVIEN_MAIL_FROM_NAME="Brasserie Vivien" \
php -S 127.0.0.1:8080
```

Without SMTP variables, `_mailer.php` falls back to PHP `mail()`, which usually is not configured on laptops and should not be treated as a successful staging test.

## Required environment variables

Set these in Plesk or the CI/deploy process, not in git:

- `PUBLIC_COOKIEYES_ID`
- `PUBLIC_GTM_ID`
- `PUBLIC_GA_MEASUREMENT_ID`
- `PUBLIC_GIFT_CARD_CHECKOUT_URL` (optional, defaults to `https://api.vivien.lv/v1/gift-cards/checkout`)
- `VIVIEN_MAIL_FROM`
- `VIVIEN_MAIL_FROM_NAME`
- `VIVIEN_SMTP_HOST`
- `VIVIEN_SMTP_PORT`
- `VIVIEN_SMTP_USER`
- `VIVIEN_SMTP_PASS`
- `VIVIEN_SMTP_SECURE`
- `VIVIEN_SMTP_TIMEOUT` (optional, defaults to `10`)
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_ENDPOINT`
- `IMAGEKIT_FOLDER`

Astro reads `PUBLIC_*` at build time. If the production `.env` lives above
`httpdocs`, make sure the deploy command exports it before `npm run build`; the
static files cannot pick up new `PUBLIC_*` values after the build is generated.

For Plesk PHP form handling, if Apache/PHP environment variables cannot be configured
in the panel, create a private `.env` file in the subscription home directory above
`httpdocs`:

```text
.env
httpdocs/
logs/
tmp/
```

Do not place `.env` inside `httpdocs`, `_staging`, `v2`, or `dist`. The deployed
`forms/_mailer.php` loads this private home-directory `.env` at runtime. Keep
`site-v2/.env.example` as a template only; never put real secrets there.

## Rollout gates

- Check `/en/`, `/lv/`, `/fr/`, `/ru/` canonical and hreflang in page source.
- Confirm menu items exist in HTML source before JS runs.
- Confirm homepage booking opens Restoplace in one tap.
- Confirm `/book/?openBooking=1&utm_source=test&ga_client_id=1234567890.1719490000` auto-opens Restoplace.
- Confirm short marketing links from `docs/SHORT_LINKS.md` return `302` redirects and preserve UTM parameters.
- Confirm booking links and the Restoplace iframe pass the site locale when Restoplace supports it, with unsupported locales falling back to `lang=en` (currently French pages use `lang=en`).
- Confirm the Restoplace iframe `src` only uses documented webhook `getparams`: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_referrer`, `roistat`.
- Confirm `roistat` carries the GA client id or Vivien session fallback id, including before CookieYes consent is accepted.
- Confirm GTM receives `booking_intent`, `restoplace_widget_open`, form success events and `reserve_success`.
- Confirm each form returns `OK` only after email delivery.
- Confirm all form emails arrive in the correct Planfix mailbox.
- Confirm legal pages contain source snapshots and legal owner approves translations/fallback language.
- Confirm `sitemap.xml` does not include staging URLs.
- Do not production launch until these gates pass.
