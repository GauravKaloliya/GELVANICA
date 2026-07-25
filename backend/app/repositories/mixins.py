from typing import Any, Optional

from sqlalchemy import func

from app.core.constants import DEFAULT_PAGE_SIZE


class NextPositionMixin:
    """Mixin providing next_position for append-only block repos."""

    def next_position(self, entity_id: str, parent_block_id: Optional[str] = None) -> int:
        query = self.session.query(func.coalesce(func.max(self.model.position), 0)).filter(
            self.model.entity_id == entity_id,
            self.model.is_deleted.is_(False),
        )
        if parent_block_id is not None:
            query = query.filter(self.model.parent_block_id == parent_block_id)
        else:
            query = query.filter(self.model.parent_block_id.is_(None))
        return query.scalar() + 1000


class ActivityLogListMixin:
    """Mixin providing list_for_workspace for ActivityLogRepository."""

    def list_for_workspace(self, workspace_id: str, page: int = 1, per_page: int = DEFAULT_PAGE_SIZE,
                           extra_filters: dict | None = None) -> Any:
        query = self.query(include_deleted=True).filter(self.model.workspace_id == workspace_id)
        if extra_filters:
            for key, value in extra_filters.items():
                if value is not None and hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
        return query.order_by(self.model.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)


class WorkspaceScopedMixin:
    """Mixin for repositories whose models are scoped to a workspace."""

    def list_for_workspace(self, workspace_id: str, page: int = 1, per_page: int = DEFAULT_PAGE_SIZE) -> Any:
        return (
            self.query()
            .filter(self.model.workspace_id == workspace_id)
            .order_by(self.model.created_at.desc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )

    def count_for_workspace(self, workspace_id: str) -> int:
        return self.query().filter(self.model.workspace_id == workspace_id).count()


# FileRepositoryHelpersMixin was removed — it was never inherited by any repository
# and contained a broken reference to app.logger.
