from flask import Blueprint, Response

from app.api.v1.helpers import check_workspace_access, item_response, list_response, pagination_args, request_json
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import db, limiter
from app.repositories import PropertyRepository, WorkspaceMemberRepository
from app.schemas.domain import PropertyCreateSchema, PropertyUpdateSchema
from app.services.security import current_user_id, secured

bp = Blueprint("properties", __name__)


def _require_admin(workspace_id: str):
    """Require admin or owner role in cloud mode. Returns error response or None."""
    from flask import current_app
    if current_app.config.get("GNOVIUM_MODE") == "cloud":
        membership = WorkspaceMemberRepository().membership(workspace_id, current_user_id())
        if not membership:
            return error("forbidden", "You do not have access to this workspace", status=403)
        if membership.role not in ("owner", "admin"):
            return error("forbidden", "Admin access required", status=403)
    return None


@bp.get("/<string:workspace_id>/properties/")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_properties(workspace_id: str) -> Response:
    """List property definitions for a workspace."""
    args = pagination_args()
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return list_response(PropertyRepository().list({"workspace_id": workspace_id}, args["page"], args["per_page"]))


@bp.post("/<string:workspace_id>/properties/")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_property(workspace_id: str) -> Response:
    """Create a new property definition."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    body = request_json()
    if not isinstance(body, dict):
        return error("bad_request", "Invalid request body", status=400)
    data = {**body, "workspace_id": workspace_id}
    validated = load_schema(PropertyCreateSchema(), data)
    admin_err = _require_admin(workspace_id)
    if admin_err:
        return admin_err
    prop = PropertyRepository().create(validated)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return item_response(prop, 201)


@bp.get("/<string:workspace_id>/properties/<string:property_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_property(workspace_id: str, property_id: str) -> Response:
    """Get a single property definition."""
    try:
        prop = PropertyRepository().get(property_id)
    except NotFoundError:
        return error("not_found", "Property not found", status=404)
    access_err = check_workspace_access(str(prop.workspace_id))
    if access_err:
        return access_err
    return item_response(prop)


@bp.patch("/<string:workspace_id>/properties/<string:property_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def update_property(workspace_id: str, property_id: str) -> Response:
    """Update a property definition."""
    try:
        prop = PropertyRepository().get(property_id)
    except NotFoundError:
        return error("not_found", "Property not found", status=404)
    access_err = check_workspace_access(str(prop.workspace_id))
    if access_err:
        return access_err
    admin_err = _require_admin(str(prop.workspace_id))
    if admin_err:
        return admin_err
    body = request_json()
    if not isinstance(body, dict):
        return error("bad_request", "Invalid request body", status=400)
    data = load_schema(PropertyUpdateSchema(), body, partial=True)
    prop = PropertyRepository().update(prop, data)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return item_response(prop)


@bp.delete("/<string:workspace_id>/properties/<string:property_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def delete_property(workspace_id: str, property_id: str) -> Response:
    """Delete a property definition."""
    try:
        prop = PropertyRepository().get(property_id)
    except NotFoundError:
        return error("not_found", "Property not found", status=404)
    access_err = check_workspace_access(str(prop.workspace_id))
    if access_err:
        return access_err
    admin_err = _require_admin(str(prop.workspace_id))
    if admin_err:
        return admin_err
    PropertyRepository().soft_delete(prop)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return item_response(prop)


@bp.post("/<string:workspace_id>/properties/<string:property_id>/restore")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def restore_property(workspace_id: str, property_id: str) -> Response:
    """Restore a soft-deleted property definition."""
    try:
        prop = PropertyRepository().get(property_id, include_deleted=True)
    except NotFoundError:
        return error("not_found", "Property not found", status=404)
    access_err = check_workspace_access(str(prop.workspace_id))
    if access_err:
        return access_err
    admin_err = _require_admin(str(prop.workspace_id))
    if admin_err:
        return admin_err
    PropertyRepository().restore(prop)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return item_response(prop)
