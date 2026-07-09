import json
import logging
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from .config import get_settings
from .db import SessionLocal, init_db
from .jobs import enqueue
from .models import CardStatus, Job, JobStatus, PaymentOrder
from .workflow import GiftCardWorkflow, RETRY_SECONDS, outbox

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


def claim_job():
    with SessionLocal() as session:
        now = datetime.now(timezone.utc)
        job = session.scalar(
            select(Job)
            .where(Job.status == JobStatus.pending, Job.run_at <= now)
            .order_by(Job.run_at, Job.created_at)
            .limit(1)
        )
        if not job:
            return None
        job.status = JobStatus.running
        job.locked_at = now
        job.attempts += 1
        session.commit()
        return job.id


def finish_job(job_id: str) -> None:
    with SessionLocal() as session:
        job = session.get(Job, job_id)
        job.status = JobStatus.completed
        job.locked_at = None
        session.commit()


def retry_or_refund(job_id: str, error: Exception) -> None:
    with SessionLocal() as session:
        job = session.get(Job, job_id)
        job.last_error = str(error)
        job.locked_at = None
        if job.job_type == "fulfill":
            order = session.get(PaymentOrder, job.entity_id)
            now = datetime.now(timezone.utc)
            deadline = order.fulfillment_deadline if order else None
            if deadline and deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            if order and deadline and now >= deadline:
                job.status = JobStatus.failed
                outbox(
                    session,
                    "gift_card.fulfillment_failed",
                    order.card,
                    {"error": str(error), "refund_queued": True},
                )
                enqueue(
                    session,
                    job_type="refund",
                    entity_id=order.id,
                    dedupe_key=f"refund:{order.id}",
                )
            else:
                delay = RETRY_SECONDS[min(job.attempts - 1, len(RETRY_SECONDS) - 1)]
                job.status = JobStatus.pending
                job.run_at = now + timedelta(seconds=delay)
        else:
            exhausted = job.attempts >= 8
            job.status = JobStatus.failed if exhausted else JobStatus.pending
            job.run_at = datetime.now(timezone.utc) + timedelta(
                seconds=RETRY_SECONDS[min(job.attempts - 1, len(RETRY_SECONDS) - 1)]
            )
            if exhausted and job.job_type == "refund":
                order = session.get(PaymentOrder, job.entity_id)
                if order:
                    order.card.status = CardStatus.manual_review
                    outbox(
                        session,
                        "gift_card.refund_failed",
                        order.card,
                        {"error": str(error), "manual_review": True},
                    )
        session.commit()


def process_job(job_id: str, workflow: GiftCardWorkflow) -> None:
    with SessionLocal() as session:
        job = session.get(Job, job_id)
        if job.job_type == "fulfill":
            workflow.fulfill(session, job.entity_id)
        elif job.job_type == "sync_balance":
            workflow.sync_balance(session, job.entity_id)
        elif job.job_type == "refund":
            workflow.refund(session, job.entity_id)
        else:
            raise RuntimeError(f"Unknown job type: {job.job_type}")


def recover_stale_jobs() -> None:
    with SessionLocal() as session:
        threshold = datetime.now(timezone.utc) - timedelta(minutes=10)
        jobs = session.scalars(
            select(Job).where(Job.status == JobStatus.running, Job.locked_at < threshold)
        )
        for job in jobs:
            job.status = JobStatus.pending
            job.locked_at = None
        session.commit()


def main() -> None:
    init_db()
    recover_stale_jobs()
    workflow = GiftCardWorkflow(settings)
    logger.info("Gift-card worker started")
    while True:
        job_id = claim_job()
        if not job_id:
            time.sleep(settings.worker_poll_seconds)
            continue
        try:
            process_job(job_id, workflow)
            finish_job(job_id)
        except Exception as exc:
            logger.exception("Job %s failed", job_id)
            retry_or_refund(job_id, exc)


if __name__ == "__main__":
    main()
