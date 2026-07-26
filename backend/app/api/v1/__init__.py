"""API v1 blueprint registration.

Registers all route blueprints under /api/v1. Cloud-only blueprints
(jobs, workspace-members) are conditionally loaded based on GNOVIUM_MODE.
"""

import os
import re

from flask import Blueprint, request

from app.api.v1.activity import bp as activity_bp
from app.api.v1.admin import bp as admin_bp
from app.api.v1.ai import bp as ai_bp
from app.api.v1.auth import bp as auth_bp
from app.api.v1.backups import bp as backups_bp
from app.api.v1.blocks import bp as blocks_bp
from app.api.v1.branches import bp as branches_bp
from app.api.v1.comments import bp as comments_bp
from app.api.v1.config import bp as config_bp
from app.api.v1.dashboard import bp as dashboard_bp
from app.api.v1.diffs import bp as diffs_bp
from app.api.v1.docs import bp as docs_bp
from app.api.v1.entities import bp as entities_bp
from app.api.v1.files import bp as files_bp
from app.api.v1.governance import bp as governance_bp
from app.api.v1.graph import bp as graph_bp
from app.api.v1.notifications import bp as notifications_bp
from app.api.v1.properties import bp as properties_bp
from app.api.v1.relations import bp as relations_bp
from app.api.v1.search import bp as search_bp
from app.api.v1.settings import bp as settings_bp
from app.api.v1.sync import bp as sync_bp
from app.api.v1.tags import bp as tags_bp
from app.api.v1.versions import bp as versions_bp
from app.api.v1.workspaces import bp as workspaces_bp


def deployment_mode():
    """Get current deployment mode at runtime (not import time)."""
    return os.environ.get("GNOVIUM_MODE", "local").strip().lower()


def _sanitize_value(value):
    """Strip control characters from string values recursively."""
    if isinstance(value, str):
        return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value).strip()
    if isinstance(value, dict):
        return {k: _sanitize_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize_value(item) for item in value]
    return value


api_v1 = Blueprint("api_v1", __name__)


@api_v1.before_request
def sanitize_request_input():
    """Sanitize all incoming JSON body strings to strip control characters."""
    if request.is_json and request.content_length and request.content_length > 0:
        try:
            original = request.get_json(silent=True)
            if isinstance(original, (dict, list)):
                sanitized = _sanitize_value(original)
                request._cached_json = {True: sanitized, False: sanitized}
        except Exception:
            from app.core.logging import logger
            logger.exception("Failed to sanitize request input")

# Core
api_v1.register_blueprint(workspaces_bp, url_prefix="/workspaces")

# Workspace-scoped Resources
api_v1.register_blueprint(entities_bp, url_prefix="/workspaces")
api_v1.register_blueprint(blocks_bp, url_prefix="/workspaces")
api_v1.register_blueprint(relations_bp, url_prefix="/workspaces")
api_v1.register_blueprint(comments_bp, url_prefix="/workspaces")
api_v1.register_blueprint(tags_bp, url_prefix="/workspaces")
api_v1.register_blueprint(properties_bp, url_prefix="/workspaces")
api_v1.register_blueprint(config_bp, url_prefix="/workspaces")

# Workspace-scoped: Versions, Branches, Diffs
api_v1.register_blueprint(branches_bp, url_prefix="/workspaces")
api_v1.register_blueprint(versions_bp, url_prefix="/workspaces")
api_v1.register_blueprint(diffs_bp, url_prefix="/workspaces")

# Search & AI
api_v1.register_blueprint(search_bp, url_prefix="/workspaces")
api_v1.register_blueprint(ai_bp, url_prefix="/workspaces")
api_v1.register_blueprint(settings_bp, url_prefix="/workspaces")

# Files
api_v1.register_blueprint(files_bp, url_prefix="/workspaces")

# Graph
api_v1.register_blueprint(graph_bp, url_prefix="/workspaces")

# Observability & Governance
api_v1.register_blueprint(activity_bp, url_prefix="/workspaces")
api_v1.register_blueprint(governance_bp, url_prefix="/workspaces")
api_v1.register_blueprint(notifications_bp, url_prefix="/workspaces")

# Dashboard & Backups
api_v1.register_blueprint(dashboard_bp, url_prefix="/workspaces")
api_v1.register_blueprint(backups_bp, url_prefix="/workspaces")

# Sync
api_v1.register_blueprint(sync_bp, url_prefix="/workspaces")

# Docs — API documentation
api_v1.register_blueprint(docs_bp, url_prefix="/docs")

# Auth — available in both modes; cloud-only endpoints gated via @cloud_only
api_v1.register_blueprint(auth_bp, url_prefix="/auth")

api_v1.register_blueprint(admin_bp, url_prefix="/admin")

if deployment_mode() == "cloud":
    from app.api.v1.jobs import bp as jobs_bp
    from app.api.v1.workspace_members import bp as workspace_members_bp

    api_v1.register_blueprint(jobs_bp, url_prefix="/workspaces")
    api_v1.register_blueprint(workspace_members_bp, url_prefix="/workspaces")
