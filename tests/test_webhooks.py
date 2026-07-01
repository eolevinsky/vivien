from fastapi.testclient import TestClient

from giftcard_service.config import get_settings
from giftcard_service.db import SessionLocal
from giftcard_service.main import app
from giftcard_service.models import GiftCard
from giftcard_service.workflow import GiftCardWorkflow

from .test_workflow import paid_order


def test_syrve_webhook_enqueues_balance_sync():
    workflow = GiftCardWorkflow(get_settings())
    with SessionLocal() as session:
        order_id, card_id = paid_order(session)
        workflow.fulfill(session, order_id)
        card = session.get(GiftCard, card_id)
        customer_id = card.syrve_customer_id

    client = TestClient(app)
    response = client.post(
        "/webhooks/syrve/balance-changed",
        headers={
            "Authorization": "Bearer test-syrve-secret",
            "X-Syrve-Event-Id": "evt-1",
        },
        json={"customerId": customer_id},
    )
    assert response.status_code == 202
    assert response.json()["matched"] is True


def test_syrve_webhook_without_event_id_accepts_repeated_notifications():
    workflow = GiftCardWorkflow(get_settings())
    with SessionLocal() as session:
        order_id, card_id = paid_order(session)
        workflow.fulfill(session, order_id)
        customer_id = session.get(GiftCard, card_id).syrve_customer_id

    client = TestClient(app)
    headers = {"Authorization": "Bearer test-syrve-secret"}
    first = client.post(
        "/webhooks/syrve/balance-changed",
        headers=headers,
        json={"customerId": customer_id},
    )
    second = client.post(
        "/webhooks/syrve/balance-changed",
        headers=headers,
        json={"customerId": customer_id},
    )

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json()["matched"] is True
    assert second.json()["matched"] is True
