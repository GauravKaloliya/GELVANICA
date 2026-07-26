"""Workspace config routes — returns reference lists of valid enum values."""

from flask import Blueprint, Response

from app.api.v1.helpers import check_workspace_access, raw_response
from app.core.constants import RATE_LIMIT_STANDARD
from app.extensions import limiter
from app.services.security import secured

bp = Blueprint("config", __name__)

PROPERTY_TYPES = [
    "text", "number", "date", "select", "multi_select",
    "checkbox", "url", "email", "phone", "rich_text",
    "boolean", "entity_ref",
]

MEMBER_ROLES = ["owner", "admin", "editor", "viewer"]

RELATION_TYPES = [
    "refers_to", "depends_on", "part_of", "related_to",
    "implements", "extends", "blocks", "follows",
]

BLOCK_TYPES = [
    "text", "heading", "heading1", "heading2", "heading3",
    "bulleted_list", "numbered_list", "to-do", "toggle",
    "code", "quote", "callout", "divider", "image", "video",
    "file", "bookmark", "equation", "table_of_contents",
    "column_list", "column", "breadcrumb",
]

SYNC_INTERVALS = [
    {"value": 10000, "label": "10 seconds"},
    {"value": 30000, "label": "30 seconds"},
    {"value": 60000, "label": "1 minute"},
    {"value": 300000, "label": "5 minutes"},
    {"value": 600000, "label": "10 minutes"},
]

CONFLICT_STRATEGIES = [
    {"value": "local_wins", "label": "Local Wins", "description": "Local changes always take precedence"},
    {"value": "remote_wins", "label": "Remote Wins", "description": "Server changes always take precedence"},
    {"value": "auto_merge", "label": "Auto-merge", "description": "Attempt automatic merge on conflicts"},
    {"value": "manual", "label": "Ask each time", "description": "Prompt for resolution on conflicts"},
]

EXPORT_FORMATS = [
    {"id": "json", "label": "JSON", "description": "Full data export with all metadata", "scope": "workspace"},
    {"id": "markdown", "label": "Markdown", "description": "Human-readable .md files with YAML frontmatter", "scope": "workspace"},
    {"id": "zip", "label": "ZIP Archive", "description": "Markdown + images + manifest.json in a .zip", "scope": "workspace"},
    {"id": "disk", "label": "Server Disk", "description": "Export to instance/backups/ on server", "scope": "workspace"},
    {"id": "html", "label": "HTML", "description": "Single entity as self-contained .html", "scope": "entity"},
    {"id": "pdf", "label": "PDF", "description": "Render a single entity to PDF", "scope": "entity"},
]

SEARCH_MODES = [
    {"id": "keyword", "label": "Keyword", "description": "Exact keyword matching"},
    {"id": "full_text", "label": "Full Text", "description": "Full-text search with ranking"},
    {"id": "hybrid", "label": "Hybrid", "description": "Combined keyword + semantic"},
    {"id": "semantic", "label": "Semantic", "description": "AI-powered semantic search"},
]

NOTIFICATION_PREFS = [
    {"key": "email_notifications", "label": "Email Notifications", "description": "Receive notifications via email"},
    {"key": "push_notifications", "label": "Push Notifications", "description": "Browser push notifications"},
    {"key": "mention_notifications", "label": "Mentions", "description": "When someone @mentions you in a comment"},
    {"key": "comment_notifications", "label": "Comments", "description": "New comments on entities you own or follow"},
    {"key": "update_notifications", "label": "Entity Updates", "description": "When entities you follow are created, updated, or deleted"},
    {"key": "governance_notifications", "label": "Governance Alerts", "description": "Health score changes and compliance issues"},
    {"key": "sync_notifications", "label": "Sync Conflicts", "description": "When sync conflicts need your resolution"},
]

GOVERNANCE_CATEGORIES = [
    {"id": "structure", "label": "Structure"},
    {"id": "content", "label": "Content"},
    {"id": "health", "label": "Health"},
]

GOVERNANCE_THRESHOLDS = {
    "excellent": 90,
    "needs_attention": 70,
}

SYNC_FREQUENCIES = [
    {"value": "realtime", "label": "Real-time"},
    {"value": "5min", "label": "Every 5 minutes"},
    {"value": "15min", "label": "Every 15 minutes"},
    {"value": "manual", "label": "Manual only"},
]


@bp.get("/<string:workspace_id>/config")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_workspace_config(workspace_id: str) -> Response:
    """Return reference config lists (property types, member roles, etc.)."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return raw_response({
        "property_types": PROPERTY_TYPES,
        "member_roles": MEMBER_ROLES,
        "relation_types": RELATION_TYPES,
        "block_types": BLOCK_TYPES,
        "sync_intervals": SYNC_INTERVALS,
        "conflict_strategies": CONFLICT_STRATEGIES,
        "export_formats": EXPORT_FORMATS,
        "search_modes": SEARCH_MODES,
        "notification_prefs": NOTIFICATION_PREFS,
        "governance_categories": GOVERNANCE_CATEGORIES,
        "governance_thresholds": GOVERNANCE_THRESHOLDS,
        "sync_frequencies": SYNC_FREQUENCIES,
    })
