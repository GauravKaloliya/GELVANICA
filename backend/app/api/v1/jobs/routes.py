"""Job management routes.

Endpoints:
  GET    /<workspace_id>/jobs/                      — List jobs for a workspace
  POST   /<workspace_id>/jobs/                      — Create a new job
  POST   /<workspace_id>/jobs/<id>/running          — Mark a job as running
  POST   /<workspace_id>/jobs/<id>/completed        — Mark a job as completed
"""

from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, cloud_only, item_response, list_response, pagination_args, request_json
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.core.validation import load_schema
from app.repositories.domain import JobRepository
from app.schemas.domain import JobCreateSchema
from app.services.job_service import JobService
from app.services.security import current_user_id, secured
from app.extensions import limiter

bp = Blueprint("jobs", __name__)


@bp.get("/<string:workspace_id>/jobs")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
@cloud_only
def list_jobs(workspace_id: str) -> Response:
    """List jobs for a workspace."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    args = pagination_args()
    filters = {"workspace_id": workspace_id}
    status = request.args.get("status")
    if status:
        filters["status"] = status
    job_type = request.args.get("type")
    if job_type:
        filters["type"] = job_type
    return list_response(JobRepository().list(filters, args["page"], args["per_page"]))


@bp.get("/<string:workspace_id>/jobs/<string:job_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
@cloud_only
def get_job(workspace_id: str, job_id: str) -> Response:
    """Get a single job by ID."""
    try:
        job = JobRepository().get(job_id)
    except NotFoundError:
        return error("not_found", "Job not found", status=404)
    if job and job.workspace_id:
        access_err = check_workspace_access(str(job.workspace_id))
        if access_err:
            return access_err
    return item_response(job)


@bp.post("/<string:workspace_id>/jobs")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
@cloud_only
def create_job(workspace_id: str) -> Response:
    """Create a new job for the authenticated user."""
    body = request_json()
    if not isinstance(body, dict):
        return error("bad_request", "Invalid request body", status=400)
    data = {**body, "workspace_id": workspace_id}
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(JobService().create(load_schema(JobCreateSchema(), data), current_user_id()), 201)


@bp.post("/<string:workspace_id>/jobs/<string:job_id>/running")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
@cloud_only
def mark_running(workspace_id: str, job_id: str) -> Response:
    """Transition a job to the running state."""
    try:
        job = JobRepository().get(job_id)
    except NotFoundError:
        return error("not_found", "Job not found", status=404)
    if job and job.workspace_id:
        access_err = check_workspace_access(str(job.workspace_id))
        if access_err:
            return access_err
    return item_response(JobService().mark_running(job_id))


@bp.post("/<string:workspace_id>/jobs/<string:job_id>/completed")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
@cloud_only
def mark_completed(workspace_id: str, job_id: str) -> Response:
    """Transition a job to the completed state with an optional result payload."""
    try:
        job = JobRepository().get(job_id)
    except NotFoundError:
        return error("not_found", "Job not found", status=404)
    if job and job.workspace_id:
        access_err = check_workspace_access(str(job.workspace_id))
        if access_err:
            return access_err
    body = request_json()
    if not isinstance(body, dict):
        return error("bad_request", "Invalid request body", status=400)
    result = body.get("result", {})
    if not isinstance(result, dict):
        return error("bad_request", "result must be a dict", status=400)
    return item_response(JobService().mark_completed(job_id, result))


@bp.post("/<string:workspace_id>/jobs/<string:job_id>/fail")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
@cloud_only
def fail_job(workspace_id: str, job_id: str) -> Response:
    """Transition a job to the failed state."""
    try:
        job = JobRepository().get(job_id)
    except NotFoundError:
        return error("not_found", "Job not found", status=404)
    if job and job.workspace_id:
        access_err = check_workspace_access(str(job.workspace_id))
        if access_err:
            return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    result = JobService().mark_failed(job_id, data.get("error"))
    return item_response(result)


@bp.post("/<string:workspace_id>/jobs/<string:job_id>/cancel")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
@cloud_only
def cancel_job(workspace_id: str, job_id: str) -> Response:
    """Cancel a pending or running job."""
    try:
        job = JobRepository().get(job_id)
    except NotFoundError:
        return error("not_found", "Job not found", status=404)
    if job and job.workspace_id:
        access_err = check_workspace_access(str(job.workspace_id))
        if access_err:
            return access_err
        from app.models.domain import WorkspaceMember
        membership = WorkspaceMember.query.filter(
            WorkspaceMember.workspace_id == job.workspace_id,
            WorkspaceMember.user_id == current_user_id(),
            WorkspaceMember.role.in_(["owner", "admin"]),
            WorkspaceMember.is_deleted.is_(False),
        ).first()
        if not membership and job.created_by != current_user_id():
            return error("forbidden", "Admin access or job creator required", status=403)
    return item_response(JobService().cancel(job_id))
