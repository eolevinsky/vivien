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
- `VIVIEN_MAIL_FROM`
- `VIVIEN_MAIL_FROM_NAME`
- `VIVIEN_SMTP_HOST`
- `VIVIEN_SMTP_PORT`
- `VIVIEN_SMTP_USER`
- `VIVIEN_SMTP_PASS`
- `VIVIEN_SMTP_SECURE`
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_ENDPOINT`
- `IMAGEKIT_FOLDER`

## Rollout gates

- Check `/en/`, `/lv/`, `/fr/`, `/ru/` canonical and hreflang in page source.
- Confirm menu items exist in HTML source before JS runs.
- Confirm homepage booking opens Restoplace in one tap.
- Confirm `/book/?openBooking=1&utm_source=test` auto-opens Restoplace.
- Confirm GTM receives `booking_intent`, `restoplace_widget_open`, form success events and `reserve_success`.
- Confirm each form returns `OK` only after email delivery.
- Confirm all form emails arrive in the correct Planfix mailbox.
- Confirm legal pages contain source snapshots and legal owner approves translations/fallback language.
- Confirm `sitemap.xml` does not include staging URLs.
- Do not production launch until these gates pass.
