import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import Settings
from .models import (
    CardStatus,
    GiftCard,
    PaymentOrder,
    PaymentStatus,
    PlanfixOutbox,
    ProviderOperation,
)
from .providers import PassSlotClient, ProviderError, SyrveClient

logger = logging.getLogger(__name__)
RETRY_SECONDS = [60, 300, 900, 1800, 3600]


def generate_card_number(session: Session) -> str:
    for _ in range(100):
        value = str(secrets.randbelow(9_000_000_0000) + 10_000_000_000)
        if not session.scalar(select(GiftCard.id).where(GiftCard.card_number == value)):
            return value
    raise RuntimeError("Unable to allocate a unique card number")


def format_money(cents: int, currency: str = "eur") -> str:
    symbol = "€" if currency.lower() == "eur" else currency.upper() + " "
    return f"{symbol}{Decimal(cents) / 100:.2f}"


def outbox(session: Session, event_type: str, card: GiftCard, extra: dict | None = None) -> None:
    order = card.orders[-1] if card.orders else None
    payload = {
        "event": event_type,
        "card_id": card.id,
        "card_number": card.card_number,
        "status": card.status.value,
        "recipient": {
            "first_name": card.recipient_first_name,
            "last_name": card.recipient_last_name,
            "email": card.recipient_email,
        },
        "balance_cents": card.balance_cents,
        "currency": card.currency,
        "passslot_url": card.passslot_url,
        "stripe_payment_intent_id": order.stripe_payment_intent_id if order else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **(extra or {}),
    }
    session.add(
        PlanfixOutbox(
            event_type=event_type,
            entity_id=card.id,
            payload_json=json.dumps(payload, ensure_ascii=False),
        )
    )


class GiftCardWorkflow:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.passslot = PassSlotClient(settings)
        self.syrve = SyrveClient(settings)

    def fulfill(self, session: Session, order_id: str) -> None:
        order = session.get(PaymentOrder, order_id)
        if not order or order.status != PaymentStatus.paid:
            return
        card = order.card
        if card.status == CardStatus.ready:
            return
        card.status = CardStatus.provisioning
        session.commit()

        try:
            self._create_pass(session, order, card)
            self._create_syrve_customer(session, card)
            self._attach_program(session, card)
            self._fund_wallet(session, order, card)
            balance = self.syrve.balance_cents(
                card.syrve_customer_id, card.syrve_gift_wallet_id
            )
            if balance < order.amount_cents:
                raise ProviderError(
                    f"Syrve wallet verification failed: expected at least {order.amount_cents}, "
                    f"received {balance}"
                )
            card.balance_cents = balance
            card.loyalty_balance_cents = self.syrve.balance_cents(
                card.syrve_customer_id, card.syrve_loyalty_wallet_id
            )
            self.passslot.update_balance(
                card.passslot_type_identifier, card.passslot_serial_number, balance
            )
            card.status = CardStatus.ready
            outbox(session, "gift_card.issued", card, {"amount_cents": order.amount_cents})
            session.commit()
        except Exception:
            session.rollback()
            raise

    def _operation(
        self,
        session: Session,
        *,
        key: str,
        provider: str,
        operation: str,
        entity_id: str,
        request: dict,
    ) -> ProviderOperation:
        current = session.scalar(
            select(ProviderOperation).where(ProviderOperation.operation_key == key)
        )
        if current:
            return current
        current = ProviderOperation(
            operation_key=key,
            provider=provider,
            operation=operation,
            entity_id=entity_id,
            request_json=json.dumps(request, ensure_ascii=False),
        )
        session.add(current)
        session.commit()
        return current

    def _create_pass(self, session: Session, order: PaymentOrder, card: GiftCard) -> None:
        if card.passslot_serial_number:
            return
        key = f"passslot:create:{card.id}"
        had_operation = (
            session.scalar(
                select(ProviderOperation.id).where(ProviderOperation.operation_key == key)
            )
            is not None
        )
        operation = self._operation(
            session,
            key=key,
            provider="passslot",
            operation="create_pass",
            entity_id=card.id,
            request={"card_number": card.card_number, "amount_cents": order.amount_cents},
        )
        result = None
        if had_operation and operation.status == "started":
            result = self.passslot.find_pass_by_card_number(card.card_number)
        if result is None:
            result = self.passslot.create_pass(
                card_number=card.card_number,
                first_name=card.recipient_first_name,
                last_name=card.recipient_last_name,
                amount_cents=order.amount_cents,
            )
        details = result
        if not (result.get("barcode") or {}).get("message"):
            details = self.passslot.get_pass(
                result["passTypeIdentifier"],
                result["serialNumber"],
                card_number=card.card_number,
            )
        barcode = (details.get("barcode") or {}).get("message")
        if not barcode:
            raise ProviderError("PassSlot pass does not contain barcode.message")
        actual_type = str(result["passTypeIdentifier"])
        expected_type = self.settings.passslot_expected_type_identifier
        if expected_type and actual_type != expected_type:
            raise ProviderError(
                f"PassSlot returned unexpected pass type {actual_type}; expected {expected_type}"
            )
        card.passslot_serial_number = str(result["serialNumber"])
        card.passslot_type_identifier = actual_type
        card.passslot_url = str(result["url"])
        card.barcode = str(barcode)
        operation.status = "completed"
        operation.external_id = card.passslot_serial_number
        operation.response_json = json.dumps(result)
        session.commit()

    def _create_syrve_customer(self, session: Session, card: GiftCard) -> None:
        if card.syrve_customer_id:
            return
        operation = self._operation(
            session,
            key=f"syrve:create_customer:{card.id}",
            provider="syrve",
            operation="create_customer",
            entity_id=card.id,
            request={"barcode": card.barcode},
        )
        customer_id = self.syrve.create_customer(
            barcode=card.barcode,
            first_name=card.recipient_first_name,
            last_name=card.recipient_last_name,
            passslot_serial=card.passslot_serial_number,
        )
        card.syrve_customer_id = customer_id
        operation.status = "completed"
        operation.external_id = customer_id
        session.commit()

    def _attach_program(self, session: Session, card: GiftCard) -> None:
        if card.syrve_gift_wallet_id and card.syrve_loyalty_wallet_id:
            return
        operation = self._operation(
            session,
            key=f"syrve:resolve_wallet:{card.id}",
            provider="syrve",
            operation="resolve_web_gift_wallet",
            entity_id=card.id,
            request={"customer_id": card.syrve_customer_id},
        )
        wallet_id = self.syrve.default_wallet_id(card.syrve_customer_id)
        # Syrve automatically assigns the Vivien Loyalty General wallet to a
        # newly created web customer. That wallet explicitly supports web gift
        # cards; the Physical Gift Cards certificate program rejects guest adds.
        card.syrve_gift_wallet_id = wallet_id
        card.syrve_loyalty_wallet_id = wallet_id
        operation.status = "completed"
        operation.external_id = wallet_id
        session.commit()

    def _fund_wallet(self, session: Session, order: PaymentOrder, card: GiftCard) -> None:
        reference = f"vivien-gift:{order.id}:{order.stripe_payment_intent_id}"
        operation = self._operation(
            session,
            key=f"syrve:topup:{order.id}",
            provider="syrve",
            operation="wallet_topup",
            entity_id=order.id,
            request={"amount_cents": order.amount_cents, "comment": reference},
        )
        if operation.status == "completed":
            return
        if not self.syrve.has_transaction(card.syrve_customer_id, reference):
            self.syrve.top_up(
                card.syrve_customer_id,
                card.syrve_gift_wallet_id,
                order.amount_cents,
                reference,
            )
        if not self.syrve.has_transaction(card.syrve_customer_id, reference):
            raise ProviderError("Syrve top-up could not be verified", ambiguous=True)
        operation.status = "completed"
        operation.response_json = json.dumps({"verified_by_comment": reference})
        session.commit()

    def sync_balance(self, session: Session, card_id: str) -> None:
        card = session.get(GiftCard, card_id)
        if (
            not card
            or not card.syrve_customer_id
            or not card.syrve_gift_wallet_id
            or not card.syrve_loyalty_wallet_id
        ):
            return
        balance = self.syrve.balance_cents(
            card.syrve_customer_id, card.syrve_gift_wallet_id
        )
        loyalty_balance = self.syrve.balance_cents(
            card.syrve_customer_id, card.syrve_loyalty_wallet_id
        )
        if balance == card.balance_cents and loyalty_balance == card.loyalty_balance_cents:
            return
        previous = card.balance_cents
        self.passslot.update_balance(
            card.passslot_type_identifier, card.passslot_serial_number, balance
        )
        card.balance_cents = balance
        card.loyalty_balance_cents = loyalty_balance
        outbox(
            session,
            "gift_card.balance_changed",
            card,
            {"previous_balance_cents": previous},
        )
        session.commit()

    def refund(self, session: Session, order_id: str) -> None:
        order = session.get(PaymentOrder, order_id)
        if not order or order.status == PaymentStatus.refunded:
            return
        card = order.card
        card.status = CardStatus.refunding
        order.status = PaymentStatus.refunding
        session.commit()

        if card.syrve_customer_id and card.syrve_gift_wallet_id:
            topup_reference = f"vivien-gift:{order.id}:{order.stripe_payment_intent_id}"
            if self.syrve.has_transaction(card.syrve_customer_id, topup_reference):
                compensation = f"vivien-refund:{order.id}:{order.stripe_payment_intent_id}"
                if not self.syrve.has_transaction(card.syrve_customer_id, compensation):
                    self.syrve.charge_off(
                        card.syrve_customer_id,
                        card.syrve_gift_wallet_id,
                        order.amount_cents,
                        compensation,
                    )
                if not self.syrve.has_transaction(card.syrve_customer_id, compensation):
                    card.status = CardStatus.manual_review
                    session.commit()
                    raise ProviderError("Syrve refund compensation could not be verified")

        if card.passslot_serial_number:
            self.passslot.delete_pass(
                card.passslot_type_identifier, card.passslot_serial_number
            )

        stripe.api_key = self.settings.stripe_secret_key
        refund = stripe.Refund.create(
            payment_intent=order.stripe_payment_intent_id,
            idempotency_key=f"vivien-refund-{order.id}",
        )
        order.stripe_refund_id = refund["id"]
        order.status = PaymentStatus.refunded
        card.status = CardStatus.refunded
        outbox(session, "gift_card.refunded", card, {"amount_cents": order.amount_cents})
        session.commit()
