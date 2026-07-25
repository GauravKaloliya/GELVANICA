"""Workspace settings routes."""

from marshmallow import RAISE, Schema

from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, list_response, pagination_args, raw_response, request_json
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import db, limiter
from app.repositories import WorkspaceRepository
from app.services.security import secured


def deployment_mode():
    """Return the current deployment mode ('local' or 'cloud')."""
    import os
    return os.environ.get("GNOVIUM_MODE", "local").strip().lower()


class _SettingsUpdateSchema(Schema):
    class Meta:
        unknown = RAISE

bp = Blueprint("settings", __name__)


def _require_settings_access(workspace_id):
    err = check_workspace_access(workspace_id)
    if err:
        return err
    from flask import current_app
    if current_app.config.get("GNOVIUM_MODE") == "cloud":
        from app.models import WorkspaceMember
        from app.services.security import current_user_id
        member = WorkspaceMember.query.filter_by(
            workspace_id=workspace_id,
            user_id=current_user_id(),
            is_deleted=False,
        ).first()
        if not member or member.role not in ("owner", "admin"):
            return error("forbidden", "Admin access required", status=403)
    return None

_VALID_CATEGORIES = frozenset({
    "general", "editor", "appearance", "ai",
    "performance", "backups", "privacy", "sync",
    "keyboard_shortcuts", "advanced",
})


@bp.get("/<string:workspace_id>/settings/<string:category>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_settings(workspace_id: str, category: str) -> Response:
    """Retrieve settings for a specific category."""
    if category not in _VALID_CATEGORIES:
        return error("invalid_category", f"Unknown settings category: {category}", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    workspace = WorkspaceRepository().get(workspace_id)
    if not workspace:
        return error("not_found", "Workspace not found", status=404)
    settings = getattr(workspace, "settings", None) or {}
    return raw_response(settings.get(category, {}))


@bp.put("/<string:workspace_id>/settings/<string:category>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def update_settings(workspace_id: str, category: str) -> Response:
    """Update settings for a specific category (merges with existing)."""
    if category not in _VALID_CATEGORIES:
        return error("invalid_category", f"Unknown settings category: {category}", status=400)
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(_SettingsUpdateSchema(), data)
    access_err = _require_settings_access(workspace_id)
    if access_err:
        return access_err
    workspace = WorkspaceRepository().get(workspace_id)
    if not workspace:
        return error("not_found", "Workspace not found", status=404)
    settings = getattr(workspace, "settings", None) or {}
    existing = settings.get(category, {})
    if isinstance(existing, dict) and isinstance(data, dict):
        existing.update(data)
        settings[category] = existing
    else:
        settings[category] = data
    workspace.settings = settings
    WorkspaceRepository().update(workspace, {"settings": settings})
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return raw_response(settings[category])


@bp.patch("/<string:workspace_id>/settings")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def patch_settings(workspace_id: str) -> Response:
    """Update workspace settings (PATCH)."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(_SettingsUpdateSchema(), data)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    if deployment_mode() == "cloud":
        from app.api.v1.workspace_members.routes import _require_member
        auth_err = _require_member(workspace_id, min_roles=["owner", "admin"])
        if auth_err:
            return auth_err
    workspace = WorkspaceRepository().get(workspace_id)
    if not workspace:
        return error("not_found", "Workspace not found", status=404)
    settings = getattr(workspace, "settings", None) or {}
    for category, values in data.items():
        if category in _VALID_CATEGORIES:
            existing = settings.get(category, {})
            if isinstance(existing, dict) and isinstance(values, dict):
                existing.update(values)
                settings[category] = existing
            else:
                settings[category] = values
    workspace.settings = settings
    WorkspaceRepository().update(workspace, {"settings": settings})
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return raw_response(settings)


@bp.get("/<string:workspace_id>/settings")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_all_settings(workspace_id: str) -> Response:
    """Retrieve all settings for a workspace. Supports ?flat=true to return a single flat dict."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    workspace = WorkspaceRepository().get(workspace_id)
    if not workspace:
        return error("not_found", "Workspace not found", status=404)
    settings = getattr(workspace, "settings", None) or {}
    if request.args.get("flat", "").lower() in ("true", "1"):
        flat = {}
        for cat_settings in settings.values():
            if isinstance(cat_settings, dict):
                flat.update(cat_settings)
        return raw_response(flat)
    args = pagination_args()
    page = args["page"]
    per_page = args["per_page"]
    items = [{"category": k, "settings": v} for k, v in settings.items()]
    total = len(items)
    start = (page - 1) * per_page
    end = start + per_page
    return list_response({
        "items": items[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
    })


_DEFAULT_SETTINGS = {
    "general": {"language": "en", "auto_save_interval": 30},
    "editor": {"default_block_type": "text", "spellcheck": True},
    "appearance": {"theme": "dark", "font_size": 14},
    "ai": {"model_path": "", "gpu_layers": 0},
    "performance": {"max_cache_size_mb": 512},
    "backups": {"backup_interval_hours": 24, "max_backups": 10},
    "privacy": {"telemetry": False},
    "sync": {"auto_sync": False, "conflict_strategy": "ask"},
    "keyboard_shortcuts": {},
    "advanced": {"debug_mode": False, "log_level": "info"},
}


@bp.post("/<string:workspace_id>/settings/reset")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def reset_settings(workspace_id: str) -> Response:
    """Reset one or all setting categories to defaults."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(_SettingsUpdateSchema(), data)
    category = data.get("category", "all")
    access_err = _require_settings_access(workspace_id)
    if access_err:
        return access_err
    workspace = WorkspaceRepository().get(workspace_id)
    if not workspace:
        return error("not_found", "Workspace not found", status=404)
    settings = getattr(workspace, "settings", None) or {}
    if category == "all":
        for cat in _VALID_CATEGORIES:
            settings[cat] = _DEFAULT_SETTINGS.get(cat, {})
    else:
        if category not in _VALID_CATEGORIES:
            return error("invalid_category", f"Unknown settings category: {category}", status=400)
        settings[category] = _DEFAULT_SETTINGS.get(category, {})
    workspace.settings = settings
    WorkspaceRepository().update(workspace, {"settings": settings})
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return raw_response(settings if category == "all" else settings[category])
