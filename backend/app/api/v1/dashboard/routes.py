"""Dashboard aggregation routes."""

from flask import Blueprint, Response

from app.api.v1.helpers import check_workspace_access, raw_response
from app.core.constants import RATE_LIMIT_LENIENT, RATE_LIMIT_STANDARD
from app.extensions import limiter
from app.services.dashboard_service import DashboardService
from app.services.security import secured

bp = Blueprint("dashboard", __name__)


@bp.get("/<string:workspace_id>/dashboard/overview")
@limiter.limit(RATE_LIMIT_LENIENT)
@secured
def overview(workspace_id: str) -> Response:
    """Return aggregated overview stats for a workspace dashboard."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return raw_response(DashboardService().overview(workspace_id))


@bp.get("/<string:workspace_id>/dashboard/storage")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def storage(workspace_id: str) -> Response:
    """Return storage breakdown by category."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return raw_response(DashboardService().storage(workspace_id))
