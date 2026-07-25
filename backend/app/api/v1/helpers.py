import re
from functools import wraps
from typing import Any, Callable, Optional

from flask import current_app, request
from marshmallow import ValidationError

from app.core.constants import DEFAULT_PAGE_SIZE
from app.core.response import error, ok_list
from app.core.serialization import model_to_dict, to_json
from app.schemas.common import PaginationMixin


def sanitize_string(value: str) -> str:
    """Strip control characters and leading/trailing whitespace from a string."""
    if not isinstance(value, str):
        return value
    value = value.strip()
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)
    return value


def sanitize_payload(data: Any) -> Any:
    """Recursively sanitize all strings in a JSON payload."""
    if isinstance(data, dict):
        return {k: sanitize_payload(v) for k, v in data.items()}
    if isinstance(data, list):
        return [sanitize_payload(item) for item in data]
    if isinstance(data, str):
        return sanitize_string(data)
    return data


def request_json() -> dict | None:
    """Parse and return the JSON request body, or None on parse failure."""
    return request.get_json(silent=True)


def pagination_args() -> dict:
    """Extract and validate pagination parameters from the query string."""
    try:
        return PaginationMixin().load(request.args)
    except ValidationError:
        from app.core.logging import logger
        logger.warning("invalid_pagination_args", query_string=request.query_string.decode("utf-8", errors="replace"))
        return {"page": 1, "per_page": DEFAULT_PAGE_SIZE}


def list_response(page) -> Any:
    """Build a paginated list response with items and metadata.
    Accepts both SQLAlchemy pagination objects and dicts with items/total/page/per_page keys.
    """
    if isinstance(page, dict):
        items = page.get("items", [])
        pg = page.get("page", 1)
        pp = page.get("per_page", DEFAULT_PAGE_SIZE)
        total = page.get("total", len(items))
        pages = (total + pp - 1) // pp if pp > 0 else 0
        meta = {"page": pg, "per_page": pp, "total": total, "pages": pages}
        return ok_list(
            [model_to_dict(item) for item in items if item is not None],
            meta,
        )
    return ok_list(
        [model_to_dict(item) for item in page.items if item is not None],
        {
            "page": page.page,
            "per_page": page.per_page,
            "total": page.total,
            "pages": page.pages,
        },
    )


def item_response(item, status: int = 200) -> Any:
    """Build a single-item response."""
    from flask import jsonify
    return jsonify({"data": model_to_dict(item)}), status


def raw_response(data, status: int = 200) -> Any:
    """Return raw JSON response. Data must be dict/list (not pre-serialized string)."""
    from flask import jsonify
    return jsonify({"data": to_json(data)}), status


def check_workspace_access(workspace_id: str) -> Optional[Any]:
    """Check that the current user has access to the workspace. Returns error response or None."""
    if not workspace_id:
        return error("bad_request", "workspace_id is required", status=400)

    from flask import current_app
    mode = current_app.config.get("GNOVIUM_MODE", "local")

    if mode == "local":
        from app.services.security import current_user_id
        user_id = current_user_id()
        if not user_id:
            return error("unauthorized", "Authentication required", status=401)
        from app.extensions import db
        from app.models import Workspace
        ws = db.session.get(Workspace, workspace_id)
        if not ws:
            return error("not_found", "Workspace not found", status=404)
        if ws.owner_id != user_id:
            return error("forbidden", "You do not have access to this workspace", status=403)
        return None

    from app.models import WorkspaceMember
    from app.services.security import current_user_id
    user_id = current_user_id()
    if not user_id:
        return error("unauthorized", "Authentication required", status=401)
    membership = WorkspaceMember.query.filter_by(
        workspace_id=workspace_id,
        user_id=user_id,
        is_deleted=False
    ).first()
    if not membership:
        return error("forbidden", "You do not have access to this workspace", status=403)
    return None


def check_workspace_role(workspace_id: str, min_roles: list[str] = None) -> Optional[Any]:
    """Check current user has a minimum role in the workspace (cloud only). Returns error or None."""
    if current_app.config.get("GNOVIUM_MODE") != "cloud":
        return None
    from app.services.security import current_user_id
    from app.repositories import WorkspaceMemberRepository
    user_id = current_user_id()
    if not user_id:
        return error("unauthorized", "Authentication required", status=401)
    roles = min_roles or ["owner", "admin"]
    membership = WorkspaceMemberRepository().membership(workspace_id, user_id)
    if not membership:
        return error("forbidden", "You do not have access to this workspace", status=403)
    if membership.role not in roles:
        return error("forbidden", "Insufficient permissions", status=403)
    return None


def cloud_only(fn: Callable) -> Callable:
    """Return 400 in local mode — these endpoints are cloud-only."""
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        if current_app.config.get("GNOVIUM_MODE", "local").strip().lower() == "local":
            from app.core.response import error as _error
            from app.core.security_logger import security_logger
            _error_resp = _error("cloud_only", "Cloud-only endpoint", status=400)
            security_logger.log_auth_failure("unknown", "cloud_only_endpoint", request.remote_addr or "unknown")
            return _error_resp
        return fn(*args, **kwargs)
    return wrapper



