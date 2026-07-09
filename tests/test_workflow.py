from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient

from giftcard_service.config import get_settings
from giftcard_service.db import SessionLocal
from giftcard_service.main import app
from giftcard_service.models import CardStatus, GiftCard, PaymentOrder, PaymentStatus
from giftcard_service.workflow import GiftCardWorkflow, generate_card_number


def paid_order(session):
    card = GiftCard(
        card_number=generate_card_number(session),
        recipient_first_name="Bill",
        recipient_last_name="Example",
        recipient_email=None,
        gift_message="Happy birthday",
        language="en",
    )
    order = PaymentOrder(
        card=card,
        amount_cents=5000,
        payer_email="buyer@example.com",
        status=PaymentStatus.paid,
        stripe_payment_intent_id="pi_test",
        fulfillment_deadline=datetime.now(timezone.utc) + timedelta(hours=2),
    )
    session.add_all([card, order])
    session.commit()
    return order.id, card.id


def test_mock_fulfillment_is_idempotent():
    workflow = GiftCardWorkflow(get_settings())
    with SessionLocal() as session:
        order_id, card_id = paid_order(session)
        workflow.fulfill(session, order_id)
        workflow.fulfill(session, order_id)
        card = session.get(GiftCard, card_id)
        assert card.status == CardStatus.ready
        assert card.balance_cents == 5000
        assert card.passslot_url.startswith("https://")
        assert card.syrve_customer_id
        assert card.syrve_gift_wallet_id
        assert card.syrve_loyalty_wallet_id
        customer = workflow.syrve._mock_customers[card.syrve_customer_id]
        topups = [item for item in customer["transactions"] if item["sum_cents"] > 0]
        assert len(topups) == 1


def test_balance_sync_updates_local_card():
    workflow = GiftCardWorkflow(get_settings())
    with SessionLocal() as session:
        order_id, card_id = paid_order(session)
        workflow.fulfill(session, order_id)
        card = session.get(GiftCard, card_id)
        workflow.syrve._mock_customers[card.syrve_customer_id]["wallets"][
            card.syrve_gift_wallet_id
        ] = 3200
        workflow.sync_balance(session, card.id)
        session.refresh(card)
        assert card.balance_cents == 3200


def test_refund_reverses_syrve_and_marks_refunded(monkeypatch):
    workflow = GiftCardWorkflow(get_settings())
    monkeypatch.setattr(
        "giftcard_service.workflow.stripe.Refund.create",
        lambda **_kwargs: {"id": "re_test"},
    )
    with SessionLocal() as session:
        order_id, card_id = paid_order(session)
        workflow.fulfill(session, order_id)
        workflow.refund(session, order_id)
        card = session.get(GiftCard, card_id)
        order = session.get(PaymentOrder, order_id)
        assert card.status == CardStatus.refunded
        assert order.status == PaymentStatus.refunded
        assert order.stripe_refund_id == "re_test"


def test_checkout_form_uses_python_api(monkeypatch):
    monkeypatch.setattr(
        "giftcard_service.main.stripe.checkout.Session.create",
        lambda **_kwargs: SimpleNamespace(id="cs_test", url="https://checkout.stripe.test/session"),
    )
    client = TestClient(app)
    response = client.post(
        "/api/gift-cards/checkout",
        data={
            "amount": "50",
            "payer_email": "buyer@example.com",
            "recipient_first_name": "Bill",
            "recipient_last_name": "Example",
            "recipient_email": "",
            "message_to_recipient": "Enjoy",
            "language": "en",
        },
    )
    assert response.status_code == 200
    assert response.json()["checkout_url"] == "https://checkout.stripe.test/session"
