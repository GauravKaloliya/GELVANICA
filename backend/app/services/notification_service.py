from app.core.errors import ForbiddenError, NotFoundError
from app.core.logging import logger
from app.extensions import db
from app.models import Notification
from app.repositories import NotificationRepository


class NotificationService:

    @staticmethod
    def _to_dict(n) -> dict:
        return {
            "id": str(n.id),
            "user_id": str(n.user_id) if n.user_id else None,
            "workspace_id": str(n.workspace_id) if n.workspace_id else None,
            "entity_id": str(n.entity_id) if n.entity_id else None,
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "data": n.data if hasattr(n, 'data') else None,
            "is_read": n.is_read if hasattr(n, 'is_read') else False,
            "is_deleted": n.is_deleted if hasattr(n, 'is_deleted') else False,
            "deleted_at": n.deleted_at.isoformat() if hasattr(n, 'deleted_at') and n.deleted_at else None,
            "deleted_by": str(n.deleted_by) if hasattr(n, 'deleted_by') and n.deleted_by else None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }

    def create(self, data: dict) -> dict:
        """Create a new notification.

        Args:
            data: Notification data including user_id, type, title, etc.

        Returns:
            The newly created notification.

        Raises:
            ForbiddenError: If attempting to create a notification for another user.
        """
        from app.services.security import current_user_id
        if data.get("user_id") and str(data["user_id"]) != str(current_user_id()):
            raise ForbiddenError("Cannot create notification for another user")
        notification = NotificationRepository().create(data)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("notification_created", extra={"notification_id": str(notification.id), "user_id": data.get("user_id")})
        return self._to_dict(notification)

    def get_by_id(self, notification_id: str, user_id: str) -> dict:
        notification = NotificationRepository().get(notification_id)
        if not notification:
            raise NotFoundError("Notification not found")
        if str(notification.user_id) != str(user_id):
            raise ForbiddenError("Access denied")
        return self._to_dict(notification)

    def list_by_user(self, user_id: str, page: int = 1, per_page: int = 50,
                     unread_only: bool = False) -> dict:
        query = NotificationRepository().query().filter(
            Notification.user_id == user_id,
            Notification.is_deleted.is_(False),
        )
        if unread_only:
            query = query.filter(Notification.is_read.is_(False))
        query = query.order_by(Notification.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [self._to_dict(n) for n in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def get_unread_count(self, user_id: str) -> dict:
        count = NotificationRepository().query().filter(
            Notification.user_id == user_id,
            Notification.is_deleted.is_(False),
            Notification.is_read.is_(False),
        ).count()
        return {"unread_count": count}

    def mark_read(self, notification_id: str, user_id: str) -> dict:
        notification = NotificationRepository().get(notification_id)
        if not notification:
            raise NotFoundError("Notification not found")
        if str(notification.user_id) != str(user_id):
            raise ForbiddenError("Access denied")
        notification.is_read = True
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("notification_marked_read", extra={"notification_id": notification_id, "user_id": user_id})
        return self._to_dict(notification)

    def mark_all_read(self, user_id: str) -> dict:
        count = NotificationRepository().query().filter(
            Notification.user_id == user_id,
            Notification.is_deleted.is_(False),
            Notification.is_read.is_(False),
        ).update({"is_read": True})
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("notifications_marked_all_read", extra={"user_id": user_id, "count": count})
        return {"marked_read": count}

    def dismiss(self, notification_id: str, user_id: str) -> dict:
        notification = NotificationRepository().get(notification_id)
        if not notification:
            raise NotFoundError("Notification not found")
        if str(notification.user_id) != str(user_id):
            raise ForbiddenError("Access denied")
        NotificationRepository().soft_delete(notification)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("notification_dismissed", extra={"notification_id": notification_id, "user_id": user_id})
        return self._to_dict(notification)
