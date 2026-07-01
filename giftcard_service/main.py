import hmac
import io
import json
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

import qrcode
import stripe
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import get_settings
from .db import SessionLocal, init_db
from .jobs import enqueue
from .models import (
    CardStatus,
    GiftCard,
    PaymentOrder,
    PaymentStatus,
    WebhookEvent,
)
from .schemas import CardStatusResponse, CheckoutRequest, CheckoutResponse
from .workflow import format_money, generate_card_number

logger = logging.getLogger(__name__)
settings = get_settings()
ROOT = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=ROOT / "giftcard_service" / "templates")

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Vivien Gift Cards", lifespan=lifespan)


def get_db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def parse_checkout_payload(payload: dict) -> CheckoutRequest:
    language_map = {
        "english": "en",
        "latviešu": "lv",
        "français": "fr",
        "русский": "ru",
    }
    language = str(payload.get("language", "en")).strip().lower()
    payload["language"] = language_map.get(language, language)
    if payload.get("recipient_email") == "":
        payload["recipient_email"] = None
    return CheckoutRequest.model_validate(payload)


@app.post("/api/gift-cards/checkout", response_model=CheckoutResponse)
async def create_checkout(request: Request, db: Session = Depends(get_db)) -> CheckoutResponse:
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        raw = await request.json()
    else:
        raw = dict(await request.form())
    try:
        checkout = parse_checkout_payload(raw)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    card = GiftCard(
        card_number=generate_card_number(db),
        recipient_first_name=checkout.recipient_first_name,
        recipient_last_name=checkout.recipient_last_name,
        recipient_email=str(checkout.recipient_email) if checkout.recipient_email else None,
        gift_message=checkout.message_to_recipient,
        language=checkout.language,
    )
    order = PaymentOrder(
        card=card,
        amount_cents=checkout.amount * 100,
        payer_email=str(checkout.payer_email),
        payer_note=checkout.payer_note,
    )
    db.add_all([card, order])
    db.flush()

    stripe.api_key = settings.stripe_secret_key
    try:
        stripe_session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            customer_email=order.payer_email,
            client_reference_id=order.id,
            locale=checkout.language,
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": "eur",
                        "unit_amount": order.amount_cents,
                        "product_data": {
                            "name": "Vivien Gift Card",
                            "description": (
                                f"Digital gift card for {card.recipient_first_name} "
                                f"{card.recipient_last_name}"
                            ),
                        },
                    },
                }
            ],
            metadata={"order_id": order.id, "gift_card_id": card.id},
            payment_intent_data={"metadata": {"order_id": order.id, "gift_card_id": card.id}},
            success_url=(
                f"{settings.base_url}/gift-card/result?session_id={{CHECKOUT_SESSION_ID}}"
            ),
            cancel_url=(
                f"{settings.base_url}/gift-card/giftcard-{checkout.language}.html"
                "?payment=cancelled"
            ),
            idempotency_key=f"vivien-checkout-{order.id}",
        )
    except Exception as exc:
        db.rollback()
        logger.exception("Stripe Checkout creation failed")
        raise HTTPException(status_code=502, detail="Unable to start payment") from exc

    order.stripe_checkout_session_id = stripe_session.id
    order.status = PaymentStatus.checkout_created
    db.commit()
    return CheckoutResponse(checkout_url=stripe_session.url)


def store_webhook(db: Session, provider: str, event_id: str, payload: str) -> WebhookEvent | None:
    event = WebhookEvent(provider=provider, event_id=event_id, payload_json=payload)
    db.add(event)
    try:
        db.flush()
        return event
    except IntegrityError:
        db.rollback()
        return None


@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> Response:
    body = await request.body()
    signature = request.headers.get("stripe-signature", "")
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured")
    try:
        event_data = stripe.Webhook.construct_event(
            body, signature, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook") from exc

    event_id = str(event_data["id"])
    stored = store_webhook(db, "stripe", event_id, body.decode("utf-8"))
    if stored is None:
        return JSONResponse({"received": True, "duplicate": True})

    event_type = event_data["type"]
    stripe_session = event_data["data"]["object"]
    order_id = (stripe_session.get("metadata") or {}).get("order_id")
    order = db.get(PaymentOrder, order_id) if order_id else None

    if order and event_type in {
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
    }:
        if (
            stripe_session.get("payment_status") == "paid"
            and int(stripe_session.get("amount_total", -1)) == order.amount_cents
            and str(stripe_session.get("currency", "")).lower() == order.currency
        ):
            order.status = PaymentStatus.paid
            order.stripe_payment_intent_id = str(stripe_session.get("payment_intent"))
            order.fulfillment_deadline = datetime.now(timezone.utc) + timedelta(
                minutes=settings.fulfillment_deadline_minutes
            )
            enqueue(
                db,
                job_type="fulfill",
                entity_id=order.id,
                dedupe_key=f"fulfill:{order.id}",
            )
        else:
            logger.error("Stripe payment did not match order %s", order.id)
    elif order and event_type == "checkout.session.expired":
        order.status = PaymentStatus.expired
    elif order and event_type == "checkout.session.async_payment_failed":
        order.status = PaymentStatus.failed

    stored.processed = True
    db.commit()
    return JSONResponse({"received": True})


@app.get("/gift-card/result", response_class=HTMLResponse)
def gift_card_result(
    request: Request, session_id: str, db: Session = Depends(get_db)
) -> Response:
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    stripe.api_key = settings.stripe_secret_key
    try:
        stripe_session = stripe.checkout.Session.retrieve(session_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid Checkout Session") from exc
    order_id = (stripe_session.get("metadata") or {}).get("order_id")
    order = db.get(PaymentOrder, order_id) if order_id else None
    if not order or order.stripe_checkout_session_id != session_id:
        raise HTTPException(status_code=404, detail="Gift-card order not found")
    return templates.TemplateResponse(
        request=request,
        name="giftcard_result.html",
        context={
            "public_token": order.card.public_token,
            "language": order.card.language,
        },
    )


@app.get("/api/gift-cards/{public_token}/status", response_model=CardStatusResponse)
def card_status(public_token: str, db: Session = Depends(get_db)) -> CardStatusResponse:
    card = db.scalar(select(GiftCard).where(GiftCard.public_token == public_token))
    if not card:
        raise HTTPException(status_code=404, detail="Gift card not found")
    order = card.orders[-1]
    safe_status = card.status.value
    error = None
    if card.status == CardStatus.manual_review:
        error = "Payment succeeded, but card activation requires staff assistance."
    return CardStatusResponse(
        status=safe_status,
        recipient_name=f"{card.recipient_first_name} {card.recipient_last_name}",
        amount=format_money(order.amount_cents, order.currency),
        balance=format_money(card.balance_cents, card.currency)
        if card.status == CardStatus.ready
        else None,
        card_number=card.card_number if card.status == CardStatus.ready else None,
        wallet_url=card.passslot_url if card.status == CardStatus.ready else None,
        qr_url=f"/api/gift-cards/{card.public_token}/qr"
        if card.status == CardStatus.ready
        else None,
        gift_message=card.gift_message,
        error=error,
    )


@app.get("/api/gift-cards/{public_token}/qr")
def card_qr(public_token: str, db: Session = Depends(get_db)) -> StreamingResponse:
    card = db.scalar(select(GiftCard).where(GiftCard.public_token == public_token))
    if not card or card.status != CardStatus.ready or not card.passslot_url:
        raise HTTPException(status_code=404, detail="QR code is not available")
    image = qrcode.make(card.passslot_url)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png")


@app.post("/webhooks/syrve/balance-changed")
async def syrve_balance_webhook(
    request: Request,
    authorization: str | None = Header(default=None),
    x_syrve_event_id: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Response:
    expected = f"Bearer {settings.syrve_webhook_secret}"
    if not settings.syrve_webhook_secret or not hmac.compare_digest(
        authorization or "", expected
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")
    payload = await request.json()
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    # Without a provider event ID, use a unique receipt ID. Balance sync reads
    # Syrve's authoritative current balance, so repeated notifications are safe.
    event_id = x_syrve_event_id or str(uuid.uuid4())
    stored = store_webhook(db, "syrve", event_id, raw)
    if stored is None:
        return JSONResponse({"accepted": True, "duplicate": True}, status_code=202)

    customer_id = payload.get("customerId") or payload.get("customer_id")
    card_identifier = (
        payload.get("cardNumber")
        or payload.get("card_number")
        or payload.get("barcode")
    )
    clauses = []
    if customer_id:
        clauses.append(GiftCard.syrve_customer_id == str(customer_id))
    if card_identifier:
        clauses.extend(
            [
                GiftCard.card_number == str(card_identifier),
                GiftCard.barcode == str(card_identifier),
            ]
        )
    card = db.scalar(select(GiftCard).where(or_(*clauses))) if clauses else None
    if not card:
        stored.processed = True
        db.commit()
        return JSONResponse({"accepted": True, "matched": False}, status_code=202)
    enqueue(
        db,
        job_type="sync_balance",
        entity_id=card.id,
        dedupe_key=f"sync_balance:{card.id}",
        payload={"event_id": event_id},
    )
    stored.processed = True
    db.commit()
    return JSONResponse({"accepted": True, "matched": True}, status_code=202)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.get("/gift-card/{filename}")
def gift_card_static(filename: str) -> FileResponse:
    allowed = {
        "giftcard-en.html",
        "giftcard-lv.html",
        "giftcard-fr.html",
        "giftcard-ru.html",
        "gift-card-choose-lang.html",
    }
    if filename not in allowed:
        raise HTTPException(status_code=404, detail="Page not found")
    return FileResponse(ROOT / "gift-card" / filename)


app.mount("/assets", StaticFiles(directory=ROOT / "assets"), name="assets")
