from functools import wraps

from flask import Blueprint, Response, request

from app.api.v1.helpers import cloud_only, list_response, pagination_args, raw_response, request_json
from app.core.constants import RATE_LIMIT_DESTRUCTIVE, RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.response import error
from app.core.serialization import model_to_dict
from app.core.validation import load_schema
from app.extensions import db, limiter
from app.repositories import UserRepository
from app.schemas.domain import UserUpdateSchema
from app.services.security import secured

bp = Blueprint("admin", __name__)


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        from app.core.response import error as _error
        from app.models.domain import WorkspaceMember
        from app.services.security import current_user_id
        user_id = current_user_id()
        if not user_id:
            return _error("unauthorized", "Authentication required", status=401)
        membership = WorkspaceMember.query.filter(
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.role.in_(["owner", "admin"]),
            WorkspaceMember.is_deleted.is_(False),
        ).first()
        if not membership:
            return _error("forbidden", "Admin access required", status=403)
        return f(*args, **kwargs)
    return decorated


@bp.get("/users")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
@require_admin

def list_users() -> Response:
    """List all users (paginated)."""
    args = pagination_args()
    filters = {}
    search = request.args.get("search")
    if search:
        filters["search"] = search
    result = UserRepository().list(
        filters=filters,
        page=args["page"], per_page=args["per_page"],
        order_by="created_at", descending=True,
    )
    return list_response(result)


@bp.get("/users/<user_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
@require_admin

def get_user(user_id: str) -> Response:
    """Get a user by ID."""
    user = UserRepository().get(user_id)
    if not user:
        return error("not_found", "User not found", status=404)
    return raw_response(model_to_dict(user, exclude={"password_hash"}))


@bp.patch("/users/<user_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
@require_admin

def update_user(user_id: str) -> Response:
    """Update any user."""
    body = request_json()
    if not isinstance(body, dict):
        return error("bad_request", "Invalid request body", status=400)
    data = load_schema(UserUpdateSchema(), body)
    repo = UserRepository()
    user = repo.get(user_id)
    if not user:
        return error("not_found", "User not found", status=404)
    repo.update(user, data)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return raw_response(model_to_dict(user, exclude={"password_hash"}))


@bp.delete("/users/<user_id>")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
@require_admin

def delete_user(user_id: str) -> Response:
    """Soft-delete a user."""
    repo = UserRepository()
    user = repo.get(user_id)
    if not user:
        return error("not_found", "User not found", status=404)
    repo.soft_delete(user)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return raw_response({"deleted": True})


@bp.get("/system/status")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
@require_admin

def system_status() -> Response:
    """System-wide status."""
    return raw_response({"message": "Not yet implemented"}, 501)


@bp.get("/system/logs")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
@require_admin

def system_logs() -> Response:
    """Get application logs."""
    return raw_response({"message": "Not yet implemented"}, 501)


@bp.post("/system/cleanup")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
@require_admin

def system_cleanup() -> Response:
    """Trigger cleanup tasks."""
    return raw_response({"message": "Not yet implemented"}, 501)
