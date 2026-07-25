"""Notification management routes."""

from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, item_response, list_response, pagination_args, raw_response, request_json
from app.core.constants import RATE_LIMIT_LENIENT, RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import limiter, db
from app.repositories import NotificationRepository
from app.schemas.domain import NotificationCreateSchema
from app.services.notification_service import NotificationService
from app.services.security import current_user_id, secured

bp = Blueprint("notifications", __name__)


@bp.get("/<string:workspace_id>/notifications")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_notifications(workspace_id: str) -> Response:
    """List notifications for the current user in a workspace."""
    user_id = current_user_id()
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    args = pagination_args()
    unread_only = request.args.get("unread_only", "").lower() in ("true", "1")
    filters = {"user_id": user_id, "workspace_id": workspace_id}
    if unread_only:
        filters["is_read"] = False
    return list_response(
        NotificationRepository().list(
            filters=filters, page=args["page"], per_page=args["per_page"],
        )
    )


@bp.post("/<string:workspace_id>/notifications")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_notification(workspace_id: str) -> Response:
    """Create and deliver a new notification."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    body = request_json()
    if not isinstance(body, dict):
        return error("bad_request", "Invalid request body", status=400)
    data = load_schema(NotificationCreateSchema(), {**body, "workspace_id": workspace_id})
    return item_response(NotificationService().create(data), 201)


@bp.post("/<string:workspace_id>/notifications/<string:notification_id>/read")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def mark_read(workspace_id: str, notification_id: str) -> Response:
    """Mark a notification as read."""
    try:
        notification = NotificationRepository().get(notification_id)
    except NotFoundError:
        return error("not_found", "Notification not found", status=404)
    if str(notification.user_id) != str(current_user_id()):
        return error("forbidden", "Not authorized", status=403)
    access_err = check_workspace_access(str(notification.workspace_id))
    if access_err:
        return access_err
    return item_response(NotificationService().mark_read(notification_id, user_id=current_user_id()))


@bp.patch("/<string:workspace_id>/notifications/<string:notification_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def mark_read_patch(workspace_id: str, notification_id: str) -> Response:
    """Mark a notification as read (PATCH)."""
    return mark_read(workspace_id, notification_id)


@bp.post("/<string:workspace_id>/notifications/<string:notification_id>/dismiss")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def dismiss(workspace_id: str, notification_id: str) -> Response:
    """Dismiss a notification without marking it as read."""
    try:
        notification = NotificationRepository().get(notification_id)
    except NotFoundError:
        return error("not_found", "Notification not found", status=404)
    if str(notification.user_id) != str(current_user_id()):
        return error("forbidden", "Not authorized", status=403)
    access_err = check_workspace_access(str(notification.workspace_id))
    if access_err:
        return access_err
    return item_response(NotificationService().dismiss(notification_id, user_id=current_user_id()))


@bp.get("/<string:workspace_id>/notifications/<string:notification_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_notification(workspace_id: str, notification_id: str) -> Response:
    """Get a single notification by ID."""
    try:
        notification = NotificationRepository().get(notification_id)
    except NotFoundError:
        return error("not_found", "Notification not found", status=404)
    if str(notification.user_id) != str(current_user_id()):
        return error("forbidden", "Not authorized", status=403)
    access_err = check_workspace_access(str(notification.workspace_id))
    if access_err:
        return access_err
    return item_response(notification)


@bp.post("/<string:workspace_id>/notifications/read-all")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def mark_all_read(workspace_id: str) -> Response:
    """Mark all notifications as read for the current user in a workspace."""
    user_id = current_user_id()
    try:
        NotificationRepository().bulk_update(
            {"user_id": user_id, "workspace_id": workspace_id, "is_read": False},
            {"is_read": True},
        )
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return raw_response({"success": True})


@bp.get("/<string:workspace_id>/notifications/unread-count")
@limiter.limit(RATE_LIMIT_LENIENT)
@secured
def unread_count(workspace_id: str) -> Response:
    """Return the count of unread notifications for the current user in a workspace."""
    user_id = current_user_id()
    count = NotificationRepository().count(filters={"user_id": user_id, "workspace_id": workspace_id, "is_read": False})
    return raw_response({"unread_count": count})
