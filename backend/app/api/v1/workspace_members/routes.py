"""Workspace member management routes."""

from flask import Blueprint, Response, request

from app.api.v1.helpers import cloud_only, item_response, list_response, pagination_args, raw_response, request_json
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import limiter
from app.repositories import WorkspaceMemberRepository
from app.schemas.domain import WorkspaceMemberInviteSchema, WorkspaceMemberUpdateSchema
from app.services.security import current_user_id, secured
from app.services.workspace_member_service import WorkspaceMemberService

bp = Blueprint("workspace_members", __name__)


def _require_member(workspace_id, min_roles=None):
    """Verify the current user is a member of the workspace with required role.

    Args:
        workspace_id: The workspace to check membership for.
        min_roles: Optional list of roles that satisfy the requirement
                   (e.g. ["owner", "admin"]). If None, any membership suffices.

    Raises:
        ApiError: 403 if not a member or insufficient role.
    """
    membership = WorkspaceMemberRepository().membership(workspace_id, current_user_id())
    if not membership:
        return error("forbidden", "You are not a member of this workspace", status=403)
    if min_roles and membership.role not in min_roles:
        return error("forbidden", "Insufficient permissions", status=403)
    return None


@bp.get("/<string:workspace_id>/members")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
@cloud_only
def list_members(workspace_id: str) -> Response:
    """List members of a workspace."""
    err = _require_member(workspace_id)
    if err:
        return err
    args = pagination_args()
    search = request.args.get("search")
    return list_response(WorkspaceMemberService().list_members(workspace_id, args["page"], args["per_page"], search=search))


@bp.get("/<string:workspace_id>/members/<string:user_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
@cloud_only
def get_member(workspace_id: str, user_id: str) -> Response:
    """Get a single member."""
    err = _require_member(workspace_id)
    if err:
        return err
    return item_response(WorkspaceMemberService().get_member(workspace_id, str(user_id)))


@bp.post("/<string:workspace_id>/members/invite")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
@cloud_only
def invite_member(workspace_id: str) -> Response:
    """Invite a user to the workspace. Owner/admin only."""
    err = _require_member(workspace_id, min_roles=["owner", "admin"])
    if err:
        return err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    return item_response(
        WorkspaceMemberService().invite(workspace_id, load_schema(WorkspaceMemberInviteSchema(), data)),
        201,
    )


@bp.patch("/<string:workspace_id>/members/<string:user_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
@cloud_only
def update_member(workspace_id: str, user_id: str) -> Response:
    """Update a member's role. Owner only."""
    if user_id == current_user_id():
        return error("bad_request", "Cannot change your own role", status=400)
    err = _require_member(workspace_id, min_roles=["owner"])
    if err:
        return err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    return item_response(
        WorkspaceMemberService().update_role(workspace_id, user_id, load_schema(WorkspaceMemberUpdateSchema(), data))
    )


@bp.delete("/<string:workspace_id>/members/<string:user_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
@cloud_only
def remove_member(workspace_id: str, user_id: str) -> Response:
    """Remove a member from the workspace. Owner/admin only."""
    if user_id == current_user_id():
        return error("bad_request", "Cannot remove yourself from the workspace", status=400)
    err = _require_member(workspace_id, min_roles=["owner", "admin"])
    if err:
        return err
    WorkspaceMemberService().remove(workspace_id, user_id)
    return raw_response({"message": "Member removed"})
