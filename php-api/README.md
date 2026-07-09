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

Deployment steps:

1. Configure the Git repository for the `api.vivien.lv` website.
2. Run Composer Install in Plesk.
3. Copy `.env.example` to `.env` outside `public/` and enter real credentials.
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
Authorization: Bearer <INTERNAL_JOB_SECRET>
```

If the shared-hosting scheduler can only call plain URLs without headers, use:

```text
GET https://api.vivien.lv/internal/process-jobs?secret=<INTERNAL_JOB_SECRET>
```

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
Authorization: Bearer <INTERNAL_JOB_SECRET>
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
