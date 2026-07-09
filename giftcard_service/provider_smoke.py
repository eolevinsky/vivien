import secrets
from dataclasses import dataclass

from .config import Settings
from .providers import PassSlotClient, SyrveClient


@dataclass
class SmokeResult:
    card_number: str
    passslot_serial: str
    syrve_customer_id: str
    balance_cents: int
    cleanup_errors: list[str]


def run_provider_smoke_test(settings: Settings, amount_cents: int = 100) -> SmokeResult:
    if settings.passslot_mode != "live" or settings.syrve_mode != "live":
        raise RuntimeError("Provider smoke test requires PASSSLOT_MODE=live and SYRVE_MODE=live")
    if amount_cents <= 0:
        raise ValueError("Smoke-test amount must be positive")

    passslot = PassSlotClient(settings)
    syrve = SyrveClient(settings)
    suffix = secrets.token_hex(4)
    card_number = str(secrets.randbelow(9_000_000_0000) + 10_000_000_000)
    serial = ""
    pass_type = ""
    customer_id = ""
    gift_wallet_id = ""
    cleanup_errors: list[str] = []

    try:
        created = passslot.create_pass(
            card_number=card_number,
            first_name="TEST",
            last_name=f"DELETE-{suffix}",
            amount_cents=amount_cents,
        )
        serial = str(created["serialNumber"])
        pass_type = str(created["passTypeIdentifier"])
        details = passslot.get_pass(pass_type, serial, card_number=card_number)
        barcode = str((details.get("barcode") or {}).get("message") or "")
        if not barcode:
            raise RuntimeError("PassSlot smoke pass did not provide a barcode")

        customer_id = syrve.create_customer(
            barcode=barcode,
            first_name="TEST",
            last_name=f"DELETE-{suffix}",
            passslot_serial=serial,
        )
        gift_wallet_id = syrve.default_wallet_id(customer_id)

        reference = f"vivien-smoke:{suffix}"
        syrve.top_up(customer_id, gift_wallet_id, amount_cents, reference)
        balance = syrve.balance_cents(customer_id, gift_wallet_id)
        if balance < amount_cents:
            raise RuntimeError(
                f"Syrve smoke-test balance mismatch: expected {amount_cents}, got {balance}"
            )
        return SmokeResult(card_number, serial, customer_id, balance, cleanup_errors)
    finally:
        if customer_id and gift_wallet_id:
            try:
                current = syrve.balance_cents(customer_id, gift_wallet_id)
                if current > 0:
                    syrve.charge_off(
                        customer_id,
                        gift_wallet_id,
                        current,
                        f"vivien-smoke-cleanup:{suffix}",
                    )
            except Exception as exc:
                cleanup_errors.append(f"Syrve balance cleanup failed: {exc}")
        if customer_id:
            try:
                syrve.delete_customer(customer_id)
            except Exception as exc:
                cleanup_errors.append(f"Syrve customer cleanup failed: {exc}")
        if serial and pass_type:
            try:
                passslot.delete_pass(pass_type, serial)
            except Exception as exc:
                cleanup_errors.append(f"PassSlot cleanup failed: {exc}")
