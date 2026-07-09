import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CardStatus(str, enum.Enum):
    pending = "pending"
    provisioning = "provisioning"
    ready = "ready"
    refunding = "refunding"
    refunded = "refunded"
    manual_review = "manual_review"


class PaymentStatus(str, enum.Enum):
    created = "created"
    checkout_created = "checkout_created"
    paid = "paid"
    refunding = "refunding"
    refunded = "refunded"
    failed = "failed"
    expired = "expired"


class JobStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class GiftCard(Base):
    __tablename__ = "gift_cards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    public_token: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, default=lambda: uuid.uuid4().hex + uuid.uuid4().hex
    )
    card_number: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    recipient_first_name: Mapped[str] = mapped_column(String(100))
    recipient_last_name: Mapped[str] = mapped_column(String(100))
    recipient_email: Mapped[str | None] = mapped_column(String(254))
    gift_message: Mapped[str] = mapped_column(Text, default="")
    language: Mapped[str] = mapped_column(String(5), default="en")
    currency: Mapped[str] = mapped_column(String(3), default="eur")
    balance_cents: Mapped[int] = mapped_column(Integer, default=0)
    loyalty_balance_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[CardStatus] = mapped_column(Enum(CardStatus), default=CardStatus.pending)

    passslot_serial_number: Mapped[str | None] = mapped_column(String(255), unique=True)
    passslot_type_identifier: Mapped[str | None] = mapped_column(String(255))
    passslot_url: Mapped[str | None] = mapped_column(Text)
    barcode: Mapped[str | None] = mapped_column(String(255), unique=True)

    syrve_customer_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    syrve_gift_wallet_id: Mapped[str | None] = mapped_column(String(64))
    syrve_loyalty_wallet_id: Mapped[str | None] = mapped_column(String(64))
    syrve_last_transaction_revision: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    orders: Mapped[list["PaymentOrder"]] = relationship(
        back_populates="card", order_by="PaymentOrder.created_at"
    )


class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    gift_card_id: Mapped[str] = mapped_column(ForeignKey("gift_cards.id"), index=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="eur")
    payer_email: Mapped[str] = mapped_column(String(254))
    payer_note: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus), default=PaymentStatus.created
    )
    stripe_checkout_session_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    stripe_refund_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    fulfillment_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    card: Mapped[GiftCard] = relationship(back_populates="orders")


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        Index("ix_jobs_due", "status", "run_at"),
        UniqueConstraint("dedupe_key", name="uq_jobs_dedupe_key"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[str] = mapped_column(String(64), index=True)
    dedupe_key: Mapped[str] = mapped_column(String(255))
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.pending)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class ProviderOperation(Base):
    __tablename__ = "provider_operations"
    __table_args__ = (UniqueConstraint("operation_key", name="uq_provider_operation_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    operation_key: Mapped[str] = mapped_column(String(255))
    provider: Mapped[str] = mapped_column(String(30))
    operation: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(30), default="started")
    request_json: Mapped[str] = mapped_column(Text, default="{}")
    response_json: Mapped[str] = mapped_column(Text, default="{}")
    external_id: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    __table_args__ = (UniqueConstraint("provider", "event_id", name="uq_webhook_event"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    provider: Mapped[str] = mapped_column(String(30))
    event_id: Mapped[str] = mapped_column(String(255))
    payload_json: Mapped[str] = mapped_column(Text)
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PlanfixOutbox(Base):
    __tablename__ = "planfix_outbox"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[str] = mapped_column(String(64), index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    delivered: Mapped[bool] = mapped_column(Boolean, default=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
