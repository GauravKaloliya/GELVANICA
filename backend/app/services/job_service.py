from datetime import datetime, timezone

from app.core.errors import ApiError, NotFoundError
from app.core.logging import logger
from app.extensions import db
from app.repositories.domain import JobRepository


def _job_model():
    try:
        from app.models import Job as _m
        from sqlalchemy import inspect
        inspect(_m)
        return _m
    except Exception:
        return None


class JobService:

    @staticmethod
    def _to_dict(job) -> dict:
        return {
            "id": str(job.id),
            "type": job.type,
            "status": job.status,
            "priority": job.priority,
            "payload": job.payload,
            "result": job.result,
            "error": job.error,
            "retry_count": job.retry_count,
            "max_retries": job.max_retries,
            "created_by": str(job.created_by) if job.created_by else None,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }

    def get_by_id(self, job_id: str) -> dict:
        job = JobRepository().get(job_id)
        if not job:
            raise NotFoundError("Job not found")
        return self._to_dict(job)

    def list(self, workspace_id: str = None, job_type: str = None,
             status: str = None, page: int = 1, per_page: int = 50) -> dict:
        JobModel = _job_model()
        if JobModel is None:
            return {"items": [], "total": 0, "page": page, "per_page": per_page}
        query = JobRepository().query()
        if workspace_id:
            query = query.filter(JobModel.workspace_id == workspace_id)
        if job_type:
            query = query.filter(JobModel.type == job_type)
        if status:
            query = query.filter(JobModel.status == status)
        query = query.order_by(JobModel.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [self._to_dict(j) for j in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def cancel(self, job_id: str) -> dict:
        job = JobRepository().get(job_id)
        if not job:
            raise NotFoundError("Job not found")
        if job.status in ("completed", "failed"):
            raise ApiError(f"Cannot cancel a {job.status} job", 400)
        job.status = "cancelled"
        job.completed_at = datetime.now(timezone.utc)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(job)

    def create(self, data: dict, user_id: str):
        """Create a new job for the given user.

        Args:
            data: Job data including job_type, payload, etc.
            user_id: The user creating the job.

        Returns:
            The newly created job.
        """
        idempotency_key = data.get("idempotency_key")
        if idempotency_key:
            existing = JobRepository().query().filter(
                JobRepository.model.idempotency_key == idempotency_key
            ).with_for_update().first()
            if existing:
                logger.info("job_duplicate_skipped", extra={"idempotency_key": idempotency_key, "existing_job_id": str(existing.id)})
                return existing

        job = JobRepository().create({**data, "created_by": user_id})
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("job_created", extra={"job_id": str(job.id), "job_type": data.get("type"), "user_id": user_id})
        return job

    def mark_running(self, job_id: str):
        """Transition a job to running status with row-level locking.

        Args:
            job_id: The job to mark as running.

        Returns:
            The updated job.

        Raises:
            ApiError: If job not found.
        """
        job = JobRepository().get_for_update(job_id)
        if not job:
            raise ApiError("Job not found", 404)
        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("job_marked_running", extra={"job_id": job_id})
        return job

    def mark_completed(self, job_id: str, result: dict):
        """Transition a job to completed status and store its result.

        Args:
            job_id: The job to mark as completed.
            result: The result payload.

        Returns:
            The updated job.

        Raises:
            ApiError: If job not found.
        """
        job = JobRepository().get_for_update(job_id)
        if not job:
            raise ApiError("Job not found", 404)
        job.status = "completed"
        job.result = result
        job.completed_at = datetime.now(timezone.utc)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("job_completed", extra={"job_id": job_id})
        return job

    def mark_failed(self, job_id: str, error_message: str = None):
        job = JobRepository().get_for_update(job_id)
        if not job:
            raise ApiError("Job not found", 404)
        job.status = "failed"
        job.error = error_message
        job.completed_at = datetime.now(timezone.utc)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("job_failed", extra={"job_id": job_id, "error": error_message})
        return job