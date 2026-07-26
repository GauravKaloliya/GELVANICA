"""API documentation routes — serves JSON overview and redirects to full API.md."""

from flask import Blueprint

from app.core.constants import RATE_LIMIT_STANDARD
from app.core.response import ok
from app.extensions import limiter

bp = Blueprint("docs", __name__)


@bp.route("/")
@limiter.limit(RATE_LIMIT_STANDARD)
def api_docs():
    """Return API documentation as JSON with overview, links, and full schema."""
    return ok({
        "api": {
            "title": "GNOVIUM API",
            "version": "1.0.0",
            "base_url": "/api/v1",
            "modes": ["local", "cloud"],
            "total_endpoints": 221,
            "docs_url": "/api/v1/docs",
            "full_documentation": "See API.md for complete endpoint reference with request/response schemas"
        },
        "authentication": {
            "type": "Bearer JWT",
            "description": "Access tokens in Authorization header. Refresh tokens for /auth/refresh and /auth/logout.",
            "endpoints": {
                "register": {"method": "POST", "path": "/auth/register", "auth": False, "mode": "local+cloud"},
                "login": {"method": "POST", "path": "/auth/login", "auth": False, "mode": "local+cloud"},
                "check_email": {"method": "GET", "path": "/auth/check-email", "auth": False},
                "google_login": {"method": "POST", "path": "/auth/google", "auth": False, "mode": "cloud"},
                "refresh": {"method": "POST", "path": "/auth/refresh", "auth": "refresh_token"},
                "logout": {"method": "POST", "path": "/auth/logout", "auth": "refresh_token"},
                "exchange_code": {"method": "POST", "path": "/auth/exchange-code", "auth": "access_token", "mode": "cloud"},
                "authorize": {"method": "POST", "path": "/auth/authorize", "auth": "access_token"},
                "webview_authorize": {"method": "GET", "path": "/auth/authorize", "auth": False},
                "exchange": {"method": "POST", "path": "/auth/exchange", "auth": False},
                "me": {"method": "GET", "path": "/auth/me", "auth": "access_token"},
                "update_me": {"method": "PATCH", "path": "/auth/me", "auth": "access_token"},
                "change_password": {"method": "POST", "path": "/auth/change-password", "auth": "access_token", "mode": "cloud"},
                "forgot_password": {"method": "POST", "path": "/auth/forgot-password", "auth": False, "mode": "local+cloud"},
                "reset_password": {"method": "POST", "path": "/auth/reset-password", "auth": False, "mode": "local+cloud"},
                "profile_changed": {"method": "POST", "path": "/auth/profile-changed", "auth": "access_token"},
                "avatar": {"method": "POST", "path": "/auth/avatar", "auth": "access_token"},
            }
        },
        "endpoints": {
            "health": {"base": "/health", "description": "Liveness check with database/redis status", "auth": False},
            "metrics": {"base": "/metrics", "description": "Prometheus-format metrics", "auth": False},
            "docs": {"base": "/docs", "description": "API documentation (this response)"},
            "workspaces": {"base": "/workspaces", "description": "Workspace CRUD and management", "endpoints": 7},
            "entities": {"base": "/entities", "description": "Entity CRUD, types, properties, children, archive, duplicate", "endpoints": 19},
            "blocks": {"base": "/blocks", "description": "Block CRUD, reorder, move", "endpoints": 9},
            "properties": {"base": "/properties", "description": "Custom property CRUD", "endpoints": 6},
            "relations": {"base": "/relations", "description": "Relation CRUD, backlinks, neighbors, paths", "endpoints": 11},
            "comments": {"base": "/comments", "description": "Threaded comments on entities and blocks", "endpoints": 6},
            "tags": {"base": "/tags", "description": "Tag CRUD and entity tagging", "endpoints": 8},
            "branches": {"base": "/branches", "description": "Branch CRUD, merge, conflicts", "endpoints": 10},
            "versions": {"base": "/versions", "description": "Changesets, snapshots, entity/block versions", "endpoints": 13},
            "diffs": {"base": "/diffs", "description": "Comparison between versions/branches", "endpoints": 2},
            "search": {"base": "/search", "description": "Full-text search (FTS5 local, PostgreSQL cloud)", "endpoints": 4},
            "ai": {"base": "/ai", "description": "AI-powered query, relation suggestions, summarization", "endpoints": 7},
            "settings": {"base": "/settings", "description": "Workspace settings by category", "endpoints": 5},
            "files": {"base": "/files", "description": "File upload, download, variants, presigned URLs", "endpoints": 22},
            "graph": {"base": "/graph", "description": "Knowledge graph materialization, traversal", "endpoints": 7},
            "governance": {"base": "/governance", "description": "Workspace health checks", "endpoints": 8},
            "dashboard": {"base": "/dashboard", "description": "Workspace overview and stats", "endpoints": 2},
            "notifications": {"base": "/notifications", "description": "User notifications", "endpoints": 8},
            "activity": {"base": "/activity", "description": "Activity log and entity events", "endpoints": 2},
            "backups": {"base": "/backups", "description": "Export/import workspace as JSON, ZIP, Markdown, HTML, PDF", "endpoints": 13},
            "sync": {"base": "/sync", "description": "Bidirectional sync operations", "endpoints": 14},
            "jobs": {"base": "/jobs", "description": "Background job management (cloud-only)", "endpoints": 7},
            "workspace_members": {"base": "/workspace-members", "description": "Member management (cloud-only)", "endpoints": 5},
            "admin": {"base": "/admin", "description": "Admin user management", "endpoints": 7},
        },
        "response_format": {
            "success": '{"data": <payload>}',
            "error": '{"error": {"code": "<error_code>", "message": "<description>", "details": {...}, "request_id": "<uuid>"}}',
            "paginated": '{"data": [<items>], "meta": {"page": 1, "per_page": 50, "total": 100, "pages": 2}}'
        },
        "error_codes": {
            "bad_request": 400,
            "unauthorized": 401,
            "forbidden": 403,
            "not_found": 404,
            "conflict": 409,
            "payload_too_large": 413,
            "validation_error": 422,
            "rate_limit_exceeded": 429,
            "internal_error": 500,
            "service_degraded": 503
        },
        "rate_limits": {
            "auth_write": "5/minute",
            "destructive": "10/minute",
            "file_upload": "10/minute",
            "file_download": "60/minute",
            "strict": "30/minute",
            "standard": "120/minute",
            "lenient": "300/minute",
            "password_reset": "3/minute"
        },
        "security": {
            "auth": "Bearer JWT (access_token) in Authorization header",
            "refresh": "Use refresh_token with /auth/refresh",
            "csrf": "Double-submit cookie pattern for sensitive endpoints",
            "hsts": "Strict-Transport-Security enabled in production",
            "cors": "Restricted to allowed origins per deployment mode"
        }
    })
