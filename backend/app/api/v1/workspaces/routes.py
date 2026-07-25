from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, check_workspace_role, item_response, list_response, pagination_args, raw_response, request_json
from app.core.constants import RATE_LIMIT_DESTRUCTIVE, RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import limiter
from app.repositories import WorkspaceRepository
from app.schemas.domain import WorkspaceCreateSchema, WorkspaceUpdateSchema
from app.services.dashboard_service import DashboardService
from app.services.security import current_user_id, secured
from app.services.workspace_service import WorkspaceService

bp = Blueprint("workspaces", __name__)


@bp.get("/")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_workspaces() -> Response:
    """List workspaces the current user belongs to."""
    args = pagination_args()
    search = request.args.get("search")
    return list_response(WorkspaceService().list_for_user(current_user_id(), args["page"], args["per_page"], search=search))


@bp.post("/")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_workspace() -> Response:
    """Create a new workspace."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(WorkspaceCreateSchema(), data)
    return item_response(WorkspaceService().create(data, current_user_id()), 201)


@bp.get("/<string:workspace_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_workspace(workspace_id: str) -> Response:
    """Get a workspace by ID."""
    try:
        ws = WorkspaceRepository().get(workspace_id)
    except NotFoundError:
        return error("not_found", "Workspace not found", status=404)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(ws)


@bp.patch("/<string:workspace_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def update_workspace(workspace_id: str) -> Response:
    """Update a workspace. Owner/admin only."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    role_err = check_workspace_role(workspace_id, min_roles=["owner", "admin"])
    if role_err:
        return role_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(WorkspaceUpdateSchema(), data, partial=True)
    return item_response(WorkspaceService().update(workspace_id, data))


@bp.delete("/<string:workspace_id>")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def delete_workspace(workspace_id: str) -> Response:
    """Soft-delete a workspace and all its entities. Admin/Owner only."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    role_err = check_workspace_role(workspace_id, min_roles=["owner", "admin"])
    if role_err:
        return role_err
    WorkspaceService().delete(workspace_id, current_user_id())
    return raw_response({"message": "Workspace deleted"})


@bp.post("/<string:workspace_id>/restore")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def restore_workspace(workspace_id: str) -> Response:
    """Restore a soft-deleted workspace."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    role_err = check_workspace_role(workspace_id, min_roles=["owner"])
    if role_err:
        return role_err
    ws = WorkspaceService().restore(workspace_id)
    return item_response(ws)


@bp.get("/<string:workspace_id>/stats")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def workspace_stats(workspace_id: str) -> Response:
    """Get workspace overview statistics."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return raw_response(DashboardService().overview(workspace_id))
