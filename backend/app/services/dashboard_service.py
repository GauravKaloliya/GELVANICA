from datetime import datetime, timedelta, timezone
from threading import Lock

from cachetools import TTLCache
from flask import current_app
from sqlalchemy import func

from app.extensions import db
from app.models import Block, Entity, Relation
try:
    from app.models import WorkspaceMember
except (ImportError, NotImplementedError):
    WorkspaceMember = None


def _dash_comment_model():
    try:
        from app.models import Comment as _m
        from sqlalchemy import inspect
        inspect(_m)
        return _m
    except Exception:
        return None


class DashboardService:
    """Service for workspace dashboard statistics and overview data."""

    def __init__(self):
        self._cache = TTLCache(maxsize=100, ttl=60)
        self._lock = Lock()

    def overview(self, workspace_id: str) -> dict:
        """Return dashboard overview counts for a workspace."""
        with self._lock:
            if workspace_id in self._cache:
                return self._cache[workspace_id]
            result = self._compute_stats(workspace_id)
            self._cache[workspace_id] = result
            return result

    def _compute_stats(self, workspace_id: str) -> dict:
        """Compute all dashboard stats for a workspace."""

        entity_count = Entity.query.filter(
            Entity.workspace_id == workspace_id, Entity.is_deleted.is_(False)
        ).count()

        def _block_count() -> int:
            entity_subq = db.session.query(Entity.id).filter(
                Entity.workspace_id == workspace_id,
                Entity.is_deleted.is_(False),
                Entity.id == Block.entity_id,
            ).correlate(Block).exists()
            return db.session.query(func.count(Block.id)).filter(
                entity_subq,
                Block.is_deleted.is_(False),
            ).scalar() or 0

        block_count = _block_count()

        relation_count = Relation.query.filter(
            Relation.workspace_id == workspace_id, Relation.is_deleted.is_(False)
        ).count()

        recent_entities = (
            Entity.query.filter(
                Entity.workspace_id == workspace_id,
                Entity.is_deleted.is_(False),
                Entity.updated_at >= (datetime.now(timezone.utc) - timedelta(days=30)),
            )
            .order_by(Entity.updated_at.desc())
            .limit(10)
            .all()
        )

        Comment = _dash_comment_model()
        comment_count = 0
        if Comment is not None:
            try:
                comment_count = Comment.query.filter(
                    Comment.workspace_id == workspace_id, Comment.is_deleted.is_(False)
                ).count()
            except Exception:
                comment_count = 0

        if current_app.config.get("GNOVIUM_MODE") == "cloud" and WorkspaceMember is not None:
            member_count = WorkspaceMember.query.filter(
                WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.is_deleted.is_(False)
            ).count()
        else:
            member_count = 1

        archived_count = Entity.query.filter(
            Entity.workspace_id == workspace_id,
            Entity.is_deleted.is_(False),
            Entity.is_archived.is_(True),
        ).count()

        return {
            "workspace_id": str(workspace_id),
            "entity_count": entity_count,
            "block_count": block_count,
            "relation_count": relation_count,
            "comment_count": comment_count,
            "member_count": member_count,
            "archived_count": archived_count,
            "recent_entities": [
                {"id": str(e.id), "name": e.name, "updated_at": e.updated_at.isoformat() if e.updated_at else None}
                for e in recent_entities
            ],
        }

    def storage(self, workspace_id: str) -> dict:
        """Return storage breakdown by category."""
        from app.models import File

        file_query = File.query.filter(
            File.workspace_id == workspace_id,
            File.is_deleted.is_(False),
        )
        file_count = file_query.count()
        total_file_size = db.session.query(func.coalesce(func.sum(File.file_size), 0)).filter(
            File.workspace_id == workspace_id,
            File.is_deleted.is_(False),
        ).scalar()

        entity_count = Entity.query.filter(
            Entity.workspace_id == workspace_id, Entity.is_deleted.is_(False)
        ).count()

        return {
            "workspace_id": str(workspace_id),
            "files": {"count": file_count, "total_size": int(total_file_size)},
            "entity_count": entity_count,
        }