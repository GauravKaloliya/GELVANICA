"""Governance routes."""

from flask import Blueprint, Response

from app.api.v1.helpers import check_workspace_access, cloud_only, item_response, list_response, pagination_args, raw_response, request_json
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.extensions import limiter
from app.models import Entity
from app.repositories import GovernanceReportRepository
from app.services.governance_service import GovernanceService
from app.services.security import current_user_id, secured
from app.core.validation import load_schema
from app.schemas.domain import GovernanceReportCreateSchema

bp = Blueprint("governance", __name__)


@bp.get("/<string:workspace_id>/governance/reports")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def list_reports(workspace_id: str) -> Response:
    """List governance reports for a workspace (most recent first)."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    args = pagination_args()
    return list_response(
        GovernanceReportRepository().list(
            filters={"workspace_id": workspace_id},
            page=args["page"],
            per_page=args["per_page"],
            order_by="created_at",
            descending=True,
        )
    )


@bp.get("/<string:workspace_id>/governance/health")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def governance_health(workspace_id: str) -> Response:
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(GovernanceService().health(workspace_id))


@bp.get("/<string:workspace_id>/governance/duplicates")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def governance_duplicates(workspace_id: str) -> Response:
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(GovernanceService().duplicates(workspace_id))


@bp.get("/<string:workspace_id>/governance/orphans")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def governance_orphans(workspace_id: str) -> Response:
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(GovernanceService().orphans(workspace_id))


@bp.get("/<string:workspace_id>/governance/stale")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def governance_stale(workspace_id: str) -> Response:
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(GovernanceService().stale(workspace_id))


@bp.get("/<string:workspace_id>/governance/health-score")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def get_health_score_history(workspace_id: str) -> Response:
    """Return historical health-score records for trend display."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return raw_response(GovernanceService().health_score_history(workspace_id))


@bp.post("/<string:workspace_id>/governance/health-score")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def recalculate_health_score(workspace_id: str) -> Response:
    # TODO: Replace with a dedicated recalculate method once available.
    # Currently reuses health() which already computes and persists scores.
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(GovernanceService().health(workspace_id))


@bp.post("/<string:workspace_id>/governance/reports")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def create_report(workspace_id: str) -> Response:
    """Generate a new governance report (queued as background job)."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    data["workspace_id"] = workspace_id
    validated = load_schema(GovernanceReportCreateSchema(), data)
    return item_response(GovernanceService().create_report(validated, current_user_id()), 201)


@bp.get("/<string:workspace_id>/governance/reports/<string:report_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def get_report(workspace_id: str, report_id: str) -> Response:
    """Get a specific governance report by ID."""
    try:
        report = GovernanceReportRepository().get(report_id)
    except NotFoundError:
        return error("not_found", "Report not found", status=404)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(report)


@bp.get("/<string:workspace_id>/governance/broken-links")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def governance_broken_links(workspace_id: str) -> Response:
    """List entities with broken references."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(GovernanceService().broken_links(workspace_id))


@bp.get("/<string:workspace_id>/governance/naming-issues")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def governance_naming_issues(workspace_id: str) -> Response:
    """List entities with naming inconsistencies."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(GovernanceService().naming_issues(workspace_id))


@bp.get("/<string:workspace_id>/governance/size-warnings")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def governance_size_warnings(workspace_id: str) -> Response:
    """List entities exceeding size thresholds."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(GovernanceService().size_warnings(workspace_id))
