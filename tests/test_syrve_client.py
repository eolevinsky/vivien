from unittest.mock import patch

from giftcard_service.config import get_settings
from giftcard_service.providers import SyrveClient


def test_customer_enables_balance_notifications_without_marketing_opt_in():
    settings = get_settings().model_copy(update={"syrve_mode": "live"})
    client = SyrveClient(settings)
    with patch.object(client, "_post", return_value={"id": "customer-1"}) as post:
        customer_id = client.create_customer(
            barcode="12345678901",
            first_name="Jane",
            last_name="Doe",
            passslot_serial="serial-1",
        )

    assert customer_id == "customer-1"
    post.assert_called_once()
    path, payload = post.call_args.args
    assert path.endswith("/customer/create_or_update")
    assert payload["shouldReceiveLoyaltyInfo"] is True
    assert payload["shouldReceivePromoActionsInfo"] is False
    assert payload["consentStatus"] == 0
    assert payload["cardNumber"] == "12345678901"
    assert payload["userData"] == "serial-1"
