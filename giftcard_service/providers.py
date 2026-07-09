import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import httpx

from .config import Settings


class ProviderError(RuntimeError):
    def __init__(self, message: str, *, ambiguous: bool = False) -> None:
        super().__init__(message)
        self.ambiguous = ambiguous


class PassSlotClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.base_url = "https://api.passslot.com/v1"

    def _mock_pass(self, card_number: str) -> dict[str, Any]:
        digest = hashlib.sha256(card_number.encode()).hexdigest()[:20]
        serial = f"mock-{digest}"
        return {
            "serialNumber": serial,
            "passTypeIdentifier": self.settings.passslot_expected_type_identifier
            or "pass.loyalty",
            "url": f"https://example.test/wallet/{serial}",
            "barcode": {"message": card_number},
        }

    def create_pass(
        self,
        *,
        card_number: str,
        first_name: str,
        last_name: str,
        amount_cents: int,
    ) -> dict[str, Any]:
        if self.settings.passslot_mode == "mock":
            return self._mock_pass(card_number)

        if not self.settings.passslot_api_key:
            raise ProviderError("PASSSLOT_API_KEY is not configured")

        now = datetime.now(timezone.utc)
        payload = {
            "cardNumber": card_number,
            "firstName": first_name,
            "lastName": last_name,
            "memberSince": now.strftime("%d.%m.%Y"),
            "joinedAt": now.date().isoformat(),
            self.settings.passslot_balance_field: float(Decimal(amount_cents) / 100),
            # These placeholders are required by the production template even
            # when this purchase flow has no value for them.
            "email": "",
            "phoneNumber": "",
            "offersUrl": "",
            "message": "",
            "referUrl": "",
            "profileUrl": "",
        }
        url = f"{self.base_url}/templates/{self.settings.passslot_template_id}/pass"
        try:
            response = httpx.post(
                url,
                json=payload,
                auth=(self.settings.passslot_api_key, ""),
                headers={"Accept": "application/json"},
                timeout=20,
            )
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ProviderError(f"PassSlot create request failed: {exc}", ambiguous=True) from exc
        if response.status_code not in range(200, 300):
            raise ProviderError(
                f"PassSlot create failed ({response.status_code}): {response.text[:500]}"
            )
        data = response.json()
        if not all(data.get(key) for key in ("serialNumber", "passTypeIdentifier", "url")):
            raise ProviderError("PassSlot create response is missing pass identifiers")
        return data

    def get_pass(
        self, pass_type_identifier: str, serial_number: str, *, card_number: str = ""
    ) -> dict[str, Any]:
        if self.settings.passslot_mode == "mock":
            return {
                **self._mock_pass(card_number),
                "serialNumber": serial_number,
                "passTypeIdentifier": pass_type_identifier,
            }
        response = httpx.get(
            f"{self.base_url}/passes/{pass_type_identifier}/{serial_number}/values",
            auth=(self.settings.passslot_api_key, ""),
            headers={"Accept": "application/json"},
            timeout=20,
        )
        if response.status_code not in range(200, 300):
            raise ProviderError(
                f"PassSlot fetch failed ({response.status_code}): {response.text[:500]}"
            )
        values = response.json()
        if not isinstance(values, dict):
            raise ProviderError("PassSlot values response is not a JSON object")
        # The production template's barcode is configured from cardNumber.
        # The base pass endpoint serves the binary .pkpass rather than metadata.
        resolved_card_number = str(values.get("cardNumber") or card_number)
        return {
            **values,
            "serialNumber": serial_number,
            "passTypeIdentifier": pass_type_identifier,
            "barcode": {"message": resolved_card_number},
        }

    def find_pass_by_card_number(self, card_number: str) -> dict[str, Any] | None:
        if self.settings.passslot_mode == "mock":
            return self._mock_pass(card_number)
        response = httpx.get(
            f"{self.base_url}/passes",
            auth=(self.settings.passslot_api_key, ""),
            headers={"Accept": "application/json"},
            timeout=20,
        )
        if response.status_code not in range(200, 300):
            raise ProviderError(
                f"PassSlot list failed ({response.status_code}): {response.text[:500]}"
            )
        data = response.json()
        passes = data if isinstance(data, list) else data.get("passes", [])
        for item in passes:
            pass_type = item.get("passTypeIdentifier")
            serial = item.get("serialNumber")
            if not pass_type or not serial:
                continue
            values_response = httpx.get(
                f"{self.base_url}/passes/{pass_type}/{serial}/values",
                auth=(self.settings.passslot_api_key, ""),
                headers={"Accept": "application/json"},
                timeout=20,
            )
            if values_response.status_code not in range(200, 300):
                continue
            values = values_response.json()
            if str(values.get("cardNumber", "")) == card_number:
                result = dict(item)
                result.setdefault("url", self.get_pass_url(pass_type, serial))
                return result
        return None

    def get_pass_url(self, pass_type_identifier: str, serial_number: str) -> str:
        if self.settings.passslot_mode == "mock":
            return f"https://example.test/wallet/{serial_number}"
        response = httpx.get(
            f"{self.base_url}/passes/{pass_type_identifier}/{serial_number}/url",
            auth=(self.settings.passslot_api_key, ""),
            headers={"Accept": "application/json"},
            timeout=20,
        )
        if response.status_code not in range(200, 300):
            raise ProviderError(
                f"PassSlot URL fetch failed ({response.status_code}): {response.text[:500]}"
            )
        return str(response.json()["url"])

    def update_balance(
        self, pass_type_identifier: str, serial_number: str, balance_cents: int
    ) -> None:
        if self.settings.passslot_mode == "mock":
            return
        response = httpx.put(
            (
                f"{self.base_url}/passes/{pass_type_identifier}/{serial_number}/values/"
                f"{self.settings.passslot_balance_field}"
            ),
            json={"value": float(Decimal(balance_cents) / 100)},
            auth=(self.settings.passslot_api_key, ""),
            timeout=20,
        )
        if response.status_code not in range(200, 300):
            raise ProviderError(
                f"PassSlot balance update failed ({response.status_code}): {response.text[:500]}"
            )

    def delete_pass(self, pass_type_identifier: str, serial_number: str) -> None:
        if self.settings.passslot_mode == "mock":
            return
        response = httpx.delete(
            f"{self.base_url}/passes/{pass_type_identifier}/{serial_number}",
            auth=(self.settings.passslot_api_key, ""),
            timeout=20,
        )
        if response.status_code not in {200, 204, 404}:
            raise ProviderError(
                f"PassSlot delete failed ({response.status_code}): {response.text[:500]}"
            )


class SyrveClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._token: str | None = None
        self._token_expires_at = datetime.min.replace(tzinfo=timezone.utc)
        self._mock_customers: dict[str, dict[str, Any]] = {}

    @property
    def loyalty_base(self) -> str:
        return f"/api/1/loyalty/{self.settings.syrve_loyalty_prefix}"

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        token = self.access_token()
        try:
            response = httpx.post(
                f"{self.settings.syrve_base_url.rstrip('/')}{path}",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=20,
            )
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ProviderError(f"Syrve request failed: {exc}", ambiguous=True) from exc
        if response.status_code not in range(200, 300):
            raise ProviderError(f"Syrve failed ({response.status_code}): {response.text[:500]}")
        data = response.json() if response.content else {}
        if isinstance(data, dict):
            if data.get("errorDescription"):
                raise ProviderError(f"Syrve error: {data['errorDescription']}")
            if int(data.get("httpStatusCode") or 0) >= 400 or data.get("errorCode"):
                raise ProviderError(
                    "Syrve error: "
                    + str(data.get("message") or data.get("description") or data.get("errorCode"))
                )
        return data

    def access_token(self) -> str:
        if self.settings.syrve_mode == "mock":
            return "mock-token"
        if self._token and self._token_expires_at > datetime.now(timezone.utc):
            return self._token
        if not self.settings.syrve_api_login:
            raise ProviderError("SYRVE_API_LOGIN is not configured")
        response = httpx.post(
            f"{self.settings.syrve_base_url.rstrip('/')}/api/1/access_token",
            json={"apiLogin": self.settings.syrve_api_login},
            timeout=20,
        )
        if response.status_code not in range(200, 300):
            raise ProviderError(
                f"Syrve token request failed ({response.status_code}): {response.text[:500]}"
            )
        data = response.json()
        token = data.get("token") if isinstance(data, dict) else None
        if not token:
            raise ProviderError("Syrve token response is missing token")
        self._token = token
        self._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        return token

    def create_customer(
        self,
        *,
        barcode: str,
        first_name: str,
        last_name: str,
        passslot_serial: str,
    ) -> str:
        if self.settings.syrve_mode == "mock":
            customer_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"vivien:{barcode}"))
            wallet_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"wallet:{customer_id}:vivien-general"))
            self._mock_customers.setdefault(
                customer_id,
                {"barcode": barcode, "wallets": {wallet_id: 0}, "transactions": []},
            )
            return customer_id
        data = self._post(
            f"{self.loyalty_base}/customer/create_or_update",
            {
                "cardTrack": barcode,
                "cardNumber": barcode,
                "name": first_name,
                "surName": last_name,
                "consentStatus": 0,
                "shouldReceiveLoyaltyInfo": False,
                "shouldReceivePromoActionsInfo": False,
                "organizationId": self.settings.syrve_organization_id,
                "userData": passslot_serial,
            },
        )
        customer_id = data.get("id")
        if not customer_id:
            raise ProviderError("Syrve create customer response is missing id")
        return str(customer_id)

    def add_program(self, customer_id: str, program_id: str) -> str:
        if self.settings.syrve_mode == "mock":
            wallet_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"wallet:{customer_id}:{program_id}"))
            self._mock_customers.setdefault(customer_id, {}).setdefault("wallets", {})[
                wallet_id
            ] = 0
            return wallet_id
        data = self._post(
            f"{self.loyalty_base}/customer/program/add",
            {
                "customerId": customer_id,
                "programId": program_id,
                "organizationId": self.settings.syrve_organization_id,
            },
        )
        wallet_id = data.get("userWalletId") or data.get("user_wallet_id")
        if not wallet_id:
            customer = self.customer_info(customer_id)
            wallet_id = self._configured_wallet_id(customer)
        if not wallet_id:
            raise ProviderError("Syrve did not return a wallet for the configured program")
        return str(wallet_id)

    def default_wallet_id(self, customer_id: str) -> str:
        info = self.customer_info(customer_id)
        wallets = info.get("walletBalances") or info.get("wallet_balances") or []
        if not wallets:
            raise ProviderError("Syrve customer has no wallet")
        preferred = [
            wallet
            for wallet in wallets
            if int(wallet.get("type", -1)) == 1
            or "vivien loyalty general" in str(wallet.get("name", "")).lower()
        ]
        selected = preferred[0] if preferred else wallets[0] if len(wallets) == 1 else None
        if not selected or not selected.get("id"):
            raise ProviderError("Unable to identify the Syrve wallet for web gift cards")
        return str(selected["id"])

    def top_up(self, customer_id: str, wallet_id: str, amount_cents: int, comment: str) -> None:
        if self.settings.syrve_mode == "mock":
            customer = self._mock_customers[customer_id]
            if not any(item["comment"] == comment for item in customer["transactions"]):
                customer["wallets"][wallet_id] += amount_cents
                customer["transactions"].append(
                    {"comment": comment, "sum_cents": amount_cents, "id": str(uuid.uuid4())}
                )
            return
        self._post(
            f"{self.loyalty_base}/customer/wallet/topup",
            {
                "customerId": customer_id,
                "walletId": wallet_id,
                "sum": float(Decimal(amount_cents) / 100),
                "comment": comment,
                "organizationId": self.settings.syrve_organization_id,
            },
        )

    def charge_off(
        self, customer_id: str, wallet_id: str, amount_cents: int, comment: str
    ) -> None:
        if self.settings.syrve_mode == "mock":
            customer = self._mock_customers[customer_id]
            if not any(item["comment"] == comment for item in customer["transactions"]):
                customer["wallets"][wallet_id] -= amount_cents
                customer["transactions"].append(
                    {"comment": comment, "sum_cents": -amount_cents, "id": str(uuid.uuid4())}
                )
            return
        self._post(
            f"{self.loyalty_base}/customer/wallet/chargeoff",
            {
                "customerId": customer_id,
                "walletId": wallet_id,
                "sum": float(Decimal(amount_cents) / 100),
                "comment": comment,
                "organizationId": self.settings.syrve_organization_id,
            },
        )

    def customer_info(self, customer_id: str) -> dict[str, Any]:
        if self.settings.syrve_mode == "mock":
            customer = self._mock_customers[customer_id]
            return {
                "id": customer_id,
                "walletBalances": [
                    {
                        "id": wallet_id,
                        "balance": balance_cents / 100,
                    }
                    for wallet_id, balance_cents in customer.get("wallets", {}).items()
                ],
            }
        return self._post(
            f"{self.loyalty_base}/customer/info",
            {
                "type": "id",
                "id": customer_id,
                "organizationId": self.settings.syrve_organization_id,
            },
        )

    def balance_cents(self, customer_id: str, wallet_id: str) -> int:
        info = self.customer_info(customer_id)
        wallets = info.get("walletBalances") or info.get("wallet_balances") or []
        for wallet in wallets:
            if str(wallet.get("id")) == wallet_id:
                return int(Decimal(str(wallet.get("balance", 0))) * 100)
        raise ProviderError("Configured Syrve wallet was not found on customer")

    def delete_customer(self, customer_id: str) -> None:
        if self.settings.syrve_mode == "mock":
            self._mock_customers.pop(customer_id, None)
            return
        try:
            self._post(
                f"{self.loyalty_base}/delete_customers",
                {
                    "customerIds": [customer_id],
                    "organizationId": self.settings.syrve_organization_id,
                },
            )
        except ProviderError as exc:
            if "CustomerNotFound" not in str(exc) and "There is no user with id" not in str(exc):
                raise

    def has_transaction(self, customer_id: str, comment: str) -> bool:
        if self.settings.syrve_mode == "mock":
            return any(
                transaction["comment"] == comment
                for transaction in self._mock_customers[customer_id]["transactions"]
            )
        now = datetime.now(timezone.utc)
        page = 0
        while page < 10:
            data = self._post(
                f"{self.loyalty_base}/customer/transactions/by_date",
                {
                    "customerId": customer_id,
                    "dateFrom": (now - timedelta(days=7)).isoformat(),
                    "dateTo": (now + timedelta(minutes=5)).isoformat(),
                    "pageNumber": page,
                    "pageSize": 100,
                    "organizationId": self.settings.syrve_organization_id,
                },
            )
            transactions = data.get("transactions") or []
            if any(item.get("comment") == comment for item in transactions):
                return True
            if len(transactions) < 100:
                return False
            page += 1
        return False

    def _configured_wallet_id(self, info: dict[str, Any]) -> str | None:
        wallets = info.get("walletBalances") or info.get("wallet_balances") or []
        if len(wallets) == 1:
            return str(wallets[0].get("id"))
        return None
