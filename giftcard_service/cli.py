import argparse

from sqlalchemy import or_, select

from .config import get_settings
from .db import SessionLocal, init_db
from .jobs import enqueue
from .models import GiftCard, PaymentOrder
from .provider_smoke import run_provider_smoke_test


def main() -> None:
    parser = argparse.ArgumentParser(description="Vivien gift-card operations")
    subparsers = parser.add_subparsers(dest="command", required=True)

    sync = subparsers.add_parser("sync-balance", help="Queue a balance synchronization")
    sync.add_argument("identifier", help="Card UUID, card number, barcode, or Syrve customer ID")

    retry = subparsers.add_parser("retry-order", help="Queue fulfillment for an order")
    retry.add_argument("order_id")

    refund = subparsers.add_parser("refund-order", help="Queue compensation and Stripe refund")
    refund.add_argument("order_id")

    smoke = subparsers.add_parser(
        "provider-smoke-test",
        help="Create, verify, reverse, and delete a small real PassSlot/Syrve test card",
    )
    smoke.add_argument(
        "--confirm-production-write",
        action="store_true",
        help="Required acknowledgement that this writes to real provider accounts",
    )
    smoke.add_argument("--amount-cents", type=int, default=100)

    args = parser.parse_args()
    if args.command == "provider-smoke-test":
        if not args.confirm_production_write:
            raise SystemExit("Refusing provider writes without --confirm-production-write")
        result = run_provider_smoke_test(get_settings(), args.amount_cents)
        print(
            "Provider smoke test passed and cleanup was attempted: "
            f"card={result.card_number}, pass={result.passslot_serial}, "
            f"syrve_customer={result.syrve_customer_id}, balance_cents={result.balance_cents}"
        )
        if result.cleanup_errors:
            raise SystemExit("Cleanup requires attention: " + "; ".join(result.cleanup_errors))
        return

    init_db()
    with SessionLocal() as session:
        if args.command == "sync-balance":
            card = session.scalar(
                select(GiftCard).where(
                    or_(
                        GiftCard.id == args.identifier,
                        GiftCard.card_number == args.identifier,
                        GiftCard.barcode == args.identifier,
                        GiftCard.syrve_customer_id == args.identifier,
                    )
                )
            )
            if not card:
                raise SystemExit("Gift card not found")
            enqueue(
                session,
                job_type="sync_balance",
                entity_id=card.id,
                dedupe_key=f"sync_balance:{card.id}",
            )
        elif args.command == "retry-order":
            if not session.get(PaymentOrder, args.order_id):
                raise SystemExit("Order not found")
            enqueue(
                session,
                job_type="fulfill",
                entity_id=args.order_id,
                dedupe_key=f"fulfill:{args.order_id}",
            )
        elif args.command == "refund-order":
            if not session.get(PaymentOrder, args.order_id):
                raise SystemExit("Order not found")
            enqueue(
                session,
                job_type="refund",
                entity_id=args.order_id,
                dedupe_key=f"refund:{args.order_id}",
            )
        session.commit()


if __name__ == "__main__":
    main()
