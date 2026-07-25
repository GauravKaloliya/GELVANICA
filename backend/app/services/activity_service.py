
from app.core.errors import NotFoundError
from app.extensions import db
from app.models import ActivityLog
from app.repositories import ActivityLogRepository


class ActivityService:
    def __init__(self, activity_log_repo=None):
        self.activity_log_repo = activity_log_repo or ActivityLogRepository()

    def create(self, data: dict) -> ActivityLog:
        entry = self.activity_log_repo.create(data)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return entry

    def list_by_workspace(self, workspace_id: str, page: int = 1, per_page: int = 30,
                          filters: dict | None = None) -> dict:
        pagination = self.activity_log_repo.list_for_workspace(workspace_id, page, per_page, filters or {})
        items = pagination.items if hasattr(pagination, 'items') else pagination
        return {
            "items": [
                {
                    "id": str(a.id),
                    "workspace_id": str(a.workspace_id),
                    "entity_id": str(a.entity_id) if a.entity_id else None,
                    "block_id": str(a.block_id) if hasattr(a, 'block_id') and a.block_id else None,
                    "user_id": str(a.user_id) if a.user_id else None,
                    "display_name": a.display_name,
                    "action": a.action,
                    "resource_type": a.resource_type,
                    "resource_id": a.resource_id,
                    "details": a.details if hasattr(a, 'details') else None,
                    "is_deleted": a.is_deleted if hasattr(a, 'is_deleted') else False,
                    "deleted_at": a.deleted_at.isoformat() if hasattr(a, 'deleted_at') and a.deleted_at else None,
                    "deleted_by": str(a.deleted_by) if hasattr(a, 'deleted_by') and a.deleted_by else None,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in items
            ],
            "total": pagination.total if hasattr(pagination, 'total') else len(items),
            "page": page,
            "per_page": per_page,
        }

    def list_by_entity(self, entity_id: str, page: int = 1, per_page: int = 30) -> dict:
        query = self.activity_log_repo.query().filter(
            ActivityLog.entity_id == entity_id
        ).order_by(ActivityLog.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [
                {
                    "id": str(a.id),
                    "workspace_id": str(a.workspace_id),
                    "entity_id": str(a.entity_id) if a.entity_id else None,
                    "block_id": str(a.block_id) if hasattr(a, 'block_id') and a.block_id else None,
                    "user_id": str(a.user_id) if a.user_id else None,
                    "display_name": a.display_name,
                    "action": a.action,
                    "resource_type": a.resource_type,
                    "resource_id": a.resource_id,
                    "details": a.details if hasattr(a, 'details') else None,
                    "is_deleted": a.is_deleted if hasattr(a, 'is_deleted') else False,
                    "deleted_at": a.deleted_at.isoformat() if hasattr(a, 'deleted_at') and a.deleted_at else None,
                    "deleted_by": str(a.deleted_by) if hasattr(a, 'deleted_by') and a.deleted_by else None,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in pagination.items
            ],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def get_by_id(self, activity_id: str) -> dict:
        entry = self.activity_log_repo.get(activity_id)
        if not entry:
            raise NotFoundError("Activity not found")
        return {
            "id": str(entry.id),
            "workspace_id": str(entry.workspace_id),
            "entity_id": str(entry.entity_id) if entry.entity_id else None,
            "block_id": str(entry.block_id) if hasattr(entry, 'block_id') and entry.block_id else None,
            "user_id": str(entry.user_id) if entry.user_id else None,
            "display_name": entry.display_name,
            "action": entry.action,
            "resource_type": entry.resource_type,
            "resource_id": entry.resource_id,
            "details": entry.details if hasattr(entry, 'details') else None,
            "is_deleted": entry.is_deleted if hasattr(entry, 'is_deleted') else False,
            "deleted_at": entry.deleted_at.isoformat() if hasattr(entry, 'deleted_at') and entry.deleted_at else None,
            "deleted_by": str(entry.deleted_by) if hasattr(entry, 'deleted_by') and entry.deleted_by else None,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        }
