# Vivien gift-card service

> The production-target implementation now lives in `php-api/` and is designed for
> PHP 8.3, MariaDB, and Plesk. This document describes the preserved Python reference
> implementation. See `php-api/README.md` for the active deployment path.

The gift-card flow is implemented as a Python/FastAPI service. Existing unrelated PHP
pages can remain in place while the site is migrated incrementally.

## Flow

1. The multilingual form posts to `POST /api/gift-cards/checkout`.
2. The backend validates the amount and creates a Stripe Checkout Session.
3. Stripe sends a signed payment webhook to `POST /webhooks/stripe`.
4. A durable SQLite job creates a PassSlot pass and reads its barcode.
5. The worker creates a new Syrve customer for that barcode.
6. Syrve automatically assigns its `Vivien Loyalty General (Customers + Employees +
   Web Gift Cards)` wallet.
7. The worker credits that wallet with the paid amount. The separate Physical Gift
   Cards certificate program is intentionally not attached because Syrve rejects
   guest additions to that program.
8. After verifying the Syrve transaction and balance, it updates PassSlot's `points`
   field and marks the card ready.
9. The result page displays the Wallet URL, QR code, card number, and a printable gift
   section.
10. Syrve balance notifications enqueue an authoritative balance refresh from Syrve.

Each purchase creates a new transferable card. The old deterministic PlanFix ClubID
formula is intentionally not used.

If fulfillment cannot complete within two hours, the worker reverses any Syrve credit,
deletes the PassSlot pass, and requests an idempotent Stripe refund. Exhausted refund
attempts put the order into `manual_review`.

PlanFix integration is represented by the `planfix_outbox` table. Issuance, balance,
failure, and refund events are recorded there for a later PlanFix sender.

## Local setup

Requirements:

- Python 3.11+
- [uv](https://docs.astral.sh/uv/)
- Stripe CLI for local webhook forwarding

Install dependencies:

```powershell
uv sync --extra dev
```

Keep real secrets only in `.env`; it is gitignored. `.env.example` documents the
supported settings.

Required for Stripe test mode:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VIVIEN_BASE_URL=http://localhost:8000
```

Use the Stripe Dashboard test-mode **Secret key**, not the Stripe CLI login key.

The existing environment names `PASSLOT_API_KEY` and `SYRVE_API_KEY` are accepted as
aliases, but the preferred names are:

```text
PASSSLOT_API_KEY=...
SYRVE_API_LOGIN=...
```

Do not store a copied Syrve bearer token. The service requests and refreshes a token
from `SYRVE_API_LOGIN`.

## Run locally

Terminal 1:

```powershell
uv run uvicorn giftcard_service.main:app --reload --port 8000
```

Terminal 2:

```powershell
uv run python -m giftcard_service.worker
```

Terminal 3:

```powershell
stripe listen --events "checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,charge.dispute.created,charge.dispute.updated,charge.dispute.funds_withdrawn,charge.dispute.closed,refund.updated,refund.failed" --forward-to "http://localhost:8080/webhooks/stripe"
```

Copy the `whsec_...` value printed by `stripe listen` into
`STRIPE_WEBHOOK_SECRET`, then restart the web process.

Open:

```text
http://localhost:8000/gift-card/giftcard-en.html
```

Stripe's standard successful test card is `4242 4242 4242 4242`, with any future
expiry and any CVC.

By default PassSlot and Syrve run in `mock` mode. This exercises the complete local
flow without creating real provider records:

```text
PASSSLOT_MODE=mock
SYRVE_MODE=mock
```

To test real providers, set both to `live`. A destructive-cleanup smoke test is
available and deliberately requires explicit acknowledgement:

```powershell
uv run python -m giftcard_service.cli provider-smoke-test --confirm-production-write
```

It creates clearly marked test records, credits €1, verifies the balance, reverses the
credit, and deletes the PassSlot pass. Syrve currently refuses to delete customers that
have wallet transactions, even after their balance returns to zero. In that case the
command exits with the zero-balance test customer ID so it can be removed manually or
retained as an integration-test record.

## Syrve webhook

Configure Syrve's balance notification target as:

```text
https://your-domain.example/webhooks/syrve/balance-changed
```

Send:

```text
Authorization: Bearer <SYRVE_WEBHOOK_SECRET>
```

If the sender can provide a stable event identifier, send it as
`X-Syrve-Event-Id`. The handler accepts `customerId`, `cardNumber`, or `barcode` to
locate the card. It does not trust a balance from the webhook body; the worker fetches
the current balances from Syrve.

## Database and operations

Apply migrations:

```powershell
uv run alembic upgrade head
```

Manual commands:

```powershell
uv run python -m giftcard_service.cli sync-balance CARD_OR_CUSTOMER_ID
uv run python -m giftcard_service.cli retry-order ORDER_ID
uv run python -m giftcard_service.cli refund-order ORDER_ID
```

SQLite runs in WAL mode. Only one worker process should be used with this deployment.
For multiple workers or higher volume, migrate the job store and application database
to PostgreSQL.

## Docker deployment

`docker-compose.yml` runs one web process and one worker with a shared persistent
SQLite volume:

```powershell
docker compose up --build -d
```

Production requirements:

- HTTPS reverse proxy
- `VIVIEN_BASE_URL` set to the public HTTPS origin
- Stripe live keys and a live webhook endpoint only after provider testing succeeds
- persistent backup of the `giftcard-data` volume
- monitoring for failed jobs and cards in `manual_review`

## Verification

Run:

```powershell
uv run pytest -q
uv run python -m compileall -q giftcard_service tests
uv run alembic upgrade head
```

The result redirect is not considered proof of payment. Only a Stripe webhook with a
valid signature, matching amount, matching currency, and `payment_status=paid` starts
fulfillment.
