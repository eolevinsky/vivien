import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import Job, JobStatus


def enqueue(
    session: Session,
    *,
    job_type: str,
    entity_id: str,
    dedupe_key: str,
    payload: dict | None = None,
    run_at: datetime | None = None,
) -> Job:
    existing = session.scalar(select(Job).where(Job.dedupe_key == dedupe_key))
    if existing:
        if existing.status in {JobStatus.failed, JobStatus.completed}:
            existing.status = JobStatus.pending
            existing.run_at = run_at or datetime.now(timezone.utc)
            existing.last_error = None
        return existing
    job = Job(
        job_type=job_type,
        entity_id=entity_id,
        dedupe_key=dedupe_key,
        payload_json=json.dumps(payload or {}),
        run_at=run_at or datetime.now(timezone.utc),
    )
    session.add(job)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        return session.scalar(select(Job).where(Job.dedupe_key == dedupe_key))
    return job
