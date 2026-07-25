"""Job runner for the cloud-mode file processing pipeline.

Handles job queue polling, dispatch, retries, and lifecycle transitions.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from flask import current_app

from app.core.constants import BACKUP_MAX_RETRIES, PROCESSING_PIPELINE_MAX_JOBS
from app.core.errors import ApiError
from app.extensions import db
from app.models import Job


class JobRunner:
    """Orchestrates job queue processing for the file processing pipeline.

    Polls pending jobs, dispatches to registered handlers, and manages
    retry/failure transitions.
    """

    def __init__(self, handlers: Dict[str, Any] | None = None):
        self._handlers = handlers or {}

    def register_handler(self, job_type: str, handler_fn) -> None:
        """Register a callable for a given job type."""
        self._handlers[job_type] = handler_fn

    def run_pending_jobs(self, max_jobs: int = PROCESSING_PIPELINE_MAX_JOBS) -> List[Dict[str, Any]]:
        """Process pending jobs from the queue. Returns list of job results."""
        pending = Job.query.filter_by(status="pending").order_by(
            Job.priority.desc(),
            Job.created_at.asc(),
        ).with_for_update(skip_locked=True).limit(max_jobs).all()

        results = []
        for job in pending:
            job.status = "running"
            job.started_at = datetime.now(timezone.utc)
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
                results.append({"job_id": str(job.id), "job_type": job.type, "status": "failed", "error": "commit_failed"})
                continue

            try:
                result = self._run_job(job)
                job.status = "completed"
                job.result = result
                job.completed_at = datetime.now(timezone.utc)
            except Exception as exc:
                job.retry_count = (job.retry_count or 0) + 1
                if job.retry_count >= (job.max_retries or BACKUP_MAX_RETRIES):
                    job.status = "failed"
                    job.result = {"error": str(exc), "retries_exhausted": True}
                    job.completed_at = datetime.now(timezone.utc)
                else:
                    job.status = "pending"
                    job.result = {"error": str(exc), "retry": job.retry_count}
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
                results.append({"job_id": str(job.id), "job_type": job.type, "status": "failed", "error": "commit_failed"})
                continue
            results.append({"job_id": str(job.id), "job_type": job.type, "status": job.status})

        return results

    def _run_job(self, job: Job) -> Any:
        """Dispatch a job to the appropriate handler by job_type."""
        handler = self._handlers.get(job.type)
        if not handler:
            raise ApiError(f"Unknown job type: {job.type}", 400, "bad_request")
        file_id = job.payload.get("file_id") if job.payload else None
        return handler(file_id)


_default_runner: Optional[JobRunner] = None


def _get_default_runner() -> JobRunner:
    global _default_runner
    if _default_runner is None:
        from app.services.processing.pipeline import ProcessingPipeline

        pipeline = ProcessingPipeline()
        _default_runner = JobRunner(handlers={
            "file_validation": lambda fid: pipeline.validate_file(fid),
            "image_thumbnail": lambda fid: pipeline.process_image_thumbnail(fid),
            "image_preview": lambda fid: pipeline.process_image_preview(fid),
            "image_optimized": lambda fid: pipeline.process_image_optimized(fid),
            "embedded_thumbnail": lambda fid: pipeline.process_image_thumbnail(fid),
            "pdf_pages": lambda fid: pipeline.process_pdf_pages(fid),
            "content_extract": lambda fid: pipeline.process_content_extract(fid),
            "cleanup_orphans": lambda _fid: pipeline.cleanup_orphans(),
            "cleanup_quarantine": lambda _fid: pipeline.cleanup_expired_quarantine(),
            "cleanup_deleted": lambda _fid: pipeline.cleanup_deleted_files(),
        })
    return _default_runner


def process_next_job() -> Optional[Dict[str, str]]:
    """Entry point for single-job processing (cloud-only worker).

    Uses SELECT ... FOR UPDATE SKIP LOCKED to prevent race conditions
    between concurrent workers.
    """
    if current_app.config.get("GNOVIUM_MODE") != "cloud":
        return None

    job = db.session.query(Job).filter(
        Job.status == "pending"
    ).with_for_update(skip_locked=True).order_by(Job.created_at.asc()).first()
    if not job:
        return None

    runner = _get_default_runner()

    job.status = "running"
    job.started_at = datetime.now(timezone.utc)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return None

    try:
        result = runner._run_job(job)
        job.status = "completed"
        job.result = result
        job.completed_at = datetime.now(timezone.utc)
    except Exception as exc:
        job.retry_count = (job.retry_count or 0) + 1
        if job.retry_count >= (job.max_retries or BACKUP_MAX_RETRIES):
            job.status = "failed"
            job.result = {"error": str(exc)}
            job.completed_at = datetime.now(timezone.utc)
        else:
            job.status = "pending"
            job.result = {"error": str(exc), "retry": job.retry_count}
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return None
    return {"job_id": str(job.id), "status": job.status}
