# Vivien API

Standalone PHP 8.3/MariaDB API for Vivien gift-card and loyalty integrations.

## Local setup

```powershell
Copy-Item .env.example .env
composer install
```

Create a MariaDB database and import `migrations/001_initial.sql`. If the database
already exists, apply later migrations in order, for example
`migrations/002_add_recipient_birthday.sql`. Configure `.env`, then serve the public
directory:

```powershell
php -S localhost:8080 -t public public/index.php
```

The Python reference implementation remains in the website repository and is not used
by this package.

## Plesk deployment

Deploy this package as the root of the separate `vivien-api` repository:

```text
/var/www/vhosts/vivien.lv/api.vivien.lv/
```

Plesk document root:

```text
/var/www/vhosts/vivien.lv/api.vivien.lv/public
```

If deploying by archive instead of a Plesk Git checkout, create the API archive from
the repository root with:

```sh
./php-api/scripts/build-plesk-zip.sh
```

Extract the zip into:

```text
/var/www/vhosts/vivien.lv/api.vivien.lv/
```

The archive contains `public/`, `src/`, `migrations/`, `templates/`, Composer files,
and `.env.example` at the archive root. It intentionally does not contain `vendor/`,
runtime logs, or a real `.env`; run Composer Install in Plesk after extracting and
create the private `.env` from the extracted `.env.example`.

The API first loads `.env` from its deployment root and then falls back to the
subscription Home `.env` one level above it. This supports a Plesk layout such as:

```text
.env
api.vivien.lv/
httpdocs/
logs/
tmp/
```

Use the Home `.env` if you want one private file for both the static site's PHP forms
and the checkout API. Include the API keys from this package's `.env.example` there;
do not copy the repository-root `.env.example`, which belongs to the Python reference
implementation.

Deployment steps:

1. Configure the Git repository for the `api.vivien.lv` website.
2. Run Composer Install in Plesk.
3. Copy `.env.example` to `.env` outside `public/`, or add the same keys to the
   subscription Home `.env`, and enter real credentials.
4. Import `migrations/001_initial.sql` into MariaDB database `vivien_loyalty`, then
   apply any later migration files in order on existing databases.
5. Confirm `https://api.vivien.lv/health`.
6. Configure Stripe webhook:
   `https://api.vivien.lv/webhooks/stripe`.
   Include these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.dispute.created`
   - `charge.dispute.updated`
   - `charge.dispute.funds_withdrawn`
   - `charge.dispute.closed`
   - `refund.updated`
   - `refund.failed`
7. Configure Syrve webhook:
   `https://api.vivien.lv/webhooks/syrve/balance-changed`.
8. Configure an external scheduler to run jobs once per minute.

Preferred scheduler request:

```text
POST https://api.vivien.lv/internal/process-jobs
Authorization: Bearer <INTERNAL_ADMIN_SECRET or INTERNAL_JOB_SECRET>
```

If the shared-hosting scheduler can only call plain URLs without headers, use:

```text
GET https://api.vivien.lv/internal/process-jobs?secret=<INTERNAL_JOB_SECRET>
```

`INTERNAL_JOB_SECRET` remains the URL-based scheduler secret. If
`INTERNAL_ADMIN_SECRET` is configured, use it for Authorization-header admin calls.

## First rollout

Use:

```text
STRIPE_SECRET_KEY=sk_test_...
PASSSLOT_MODE=live
SYRVE_MODE=live
```

After a test purchase, queue compensation with:

```http
POST /internal/orders/{order-id}/refund
Authorization: Bearer <INTERNAL_ADMIN_SECRET or INTERNAL_JOB_SECRET>
```

Then invoke `/internal/process-jobs` until the refund job completes. Syrve may retain a
zero-balance customer after wallet transactions; this is a known provider limitation.

## Security

- Never place `.env`, source code, migrations, logs, or `vendor/` under `public/`.
- Keep `APP_DEBUG=false` in production.
- Use separate long random values for `SYRVE_WEBHOOK_SECRET` and
  `INTERNAL_JOB_SECRET`.
- Allow CORS only from the production Vivien website origins.
- Keep `MAX_REQUEST_BYTES`, `CHECKOUT_RATE_LIMIT`, and
  `CHECKOUT_RATE_WINDOW_SECONDS` conservative unless there is a concrete reason to
  raise them.
