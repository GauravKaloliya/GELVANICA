from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from flask import current_app
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from app.core.errors import ApiError, ConflictError, NotFoundError
from app.extensions import db
from app.models import Block, Entity, Relation, WorkspaceMember
from app.repositories import WorkspaceMemberRepository, WorkspaceRepository


@dataclass
class PaginatedResult:
    """Simple container for paginated query results."""

    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int


def _cascade_delete_comment(workspace_id, now, user_id):
    try:
        from app.models import Comment
        from sqlalchemy import inspect
        try:
            inspect(Comment)
        except Exception:
            return
        db.session.execute(
            update(Comment).where(
                Comment.workspace_id == str(workspace_id),
                Comment.is_deleted.is_(False),
            ).values(is_deleted=True, deleted_at=now, deleted_by=user_id)
        )
    except Exception:
        pass


def _cascade_restore_comment(workspace_id):
    try:
        from app.models import Comment
        from sqlalchemy import inspect
        try:
            inspect(Comment)
        except Exception:
            return
        db.session.execute(
            update(Comment).where(
                Comment.workspace_id == str(workspace_id),
                Comment.is_deleted.is_(True),
            ).values(is_deleted=False, deleted_at=None, deleted_by=None)
        )
    except Exception:
        pass


class WorkspaceService:
    """Service for workspace CRUD and lifecycle operations."""

    def __init__(self, workspace_repo=None, workspace_member_repo=None):
        self.workspace_repo = workspace_repo or WorkspaceRepository()
        self.workspace_member_repo = workspace_member_repo or WorkspaceMemberRepository()

    def create(self, data: Dict[str, Any], user_id: str) -> Any:
        """Create a new workspace and optionally add the creator as owner."""
        if not data.get("name") or not isinstance(data["name"], str) or not data["name"].strip():
            raise ApiError("Workspace name is required", 400, "bad_request")
        existing = WorkspaceRepository().query().with_for_update().filter_by(owner_id=user_id, name=data["name"].strip(), is_deleted=False).first()
        if existing:
            raise ConflictError("Workspace already exists")
        workspace = WorkspaceRepository().create({**data, "owner_id": user_id})
        if current_app.config.get("GNOVIUM_MODE") == "cloud":
            try:
                db.session.flush()
            except Exception:
                db.session.rollback()
                raise
            WorkspaceMemberRepository().create({"workspace_id": workspace.id, "user_id": user_id, "role": "owner"})
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Workspace already exists")
        except Exception:
            db.session.rollback()
            raise
        return {
            "id": str(workspace.id),
            "name": workspace.name,
            "description": workspace.description if hasattr(workspace, 'description') else None,
            "owner_id": str(workspace.owner_id) if workspace.owner_id else None,
        }

    def get_by_id(self, workspace_id: str) -> dict:
        workspace = self.workspace_repo.get(workspace_id)
        if not workspace:
            raise NotFoundError("Workspace not found")
        return {
            "id": str(workspace.id),
            "name": workspace.name,
            "description": workspace.description if hasattr(workspace, 'description') else None,
            "owner_id": str(workspace.owner_id) if workspace.owner_id else None,
            "settings": workspace.settings if hasattr(workspace, 'settings') else None,
            "created_at": workspace.created_at.isoformat() if hasattr(workspace, 'created_at') and workspace.created_at else None,
            "updated_at": workspace.updated_at.isoformat() if hasattr(workspace, 'updated_at') and workspace.updated_at else None,
        }

    def list_for_user(self, user_id: str, page: int = 1, per_page: int = 10, search: Optional[str] = None) -> Any:
        """List workspaces the user belongs to, with pagination."""
        filters = {}
        if search:
            filters["search"] = search
        if current_app.config.get("GNOVIUM_MODE") == "cloud":
            query = (
                db.session.query(WorkspaceRepository.model)
                .join(WorkspaceMember, WorkspaceRepository.model.id == WorkspaceMember.workspace_id)
                .filter(WorkspaceMember.user_id == user_id)
            )
            if search:
                from sqlalchemy import or_
                query = query.filter(
                    or_(
                        WorkspaceRepository.model.name.ilike(f"%{search}%"),
                        WorkspaceRepository.model.description.ilike(f"%{search}%"),
                    )
                )
            results = query.paginate(page=page, per_page=per_page, error_out=False)
            return PaginatedResult(
                items=results.items,
                total=results.total,
                page=results.page,
                per_page=results.per_page,
                pages=results.pages,
            )
        return WorkspaceRepository().list(filters=filters, page=page, per_page=per_page)

    def update(self, workspace_id: str, data: Dict[str, Any]) -> Any:
        """Update workspace fields. Only name, description, and icon are mutable."""
        repo = WorkspaceRepository()
        workspace = repo.get(workspace_id)
        if not workspace:
            raise NotFoundError("Workspace not found")
        allowed = {"name", "description", "settings"}
        filtered = {k: v for k, v in data.items() if k in allowed}
        repo.update(workspace, filtered)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return {
            "id": str(workspace.id),
            "name": workspace.name,
            "description": workspace.description if hasattr(workspace, 'description') else None,
            "owner_id": str(workspace.owner_id) if workspace.owner_id else None,
            "settings": workspace.settings if hasattr(workspace, 'settings') else None,
        }

    def delete(self, workspace_id: str, user_id: Optional[str] = None) -> Any:
        """Soft-delete a workspace and cascade to entities, blocks, comments, and relations."""
        workspace = WorkspaceRepository().query().filter(WorkspaceRepository.model.id == workspace_id).with_for_update().first()
        if not workspace:
            raise NotFoundError("Workspace not found")
        WorkspaceRepository().soft_delete(workspace, deleted_by=user_id)

        now = datetime.now(timezone.utc)

        # Cascade soft-delete to entities, blocks, comments, relations
        entities = Entity.query.filter(
            Entity.workspace_id == str(workspace_id),
            Entity.is_deleted.is_(False),
        ).all()
        entity_ids = [e.id for e in entities]

        db.session.execute(
            update(Entity).where(
                Entity.workspace_id == str(workspace_id),
                Entity.is_deleted.is_(False),
            ).values(is_deleted=True, deleted_at=now, deleted_by=user_id)
        )

        # Cascade soft-delete to related records
        if entity_ids:
            db.session.execute(
                update(Block).where(
                    Block.entity_id.in_(entity_ids),
                    Block.is_deleted.is_(False),
                ).values(is_deleted=True, deleted_at=now, deleted_by=user_id)
            )
        db.session.execute(
            update(Relation).where(
                db.or_(
                    Relation.source_id.in_(entity_ids),
                    Relation.target_id.in_(entity_ids),
                ),
                Relation.is_deleted.is_(False),
            ).values(is_deleted=True, deleted_at=now, deleted_by=user_id)
        )

        _cascade_delete_comment(workspace_id, now, user_id)

        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return workspace

    def restore(self, workspace_id: str, user_id: Optional[str] = None) -> Any:
        """Restore a soft-deleted workspace and its entities."""
        workspace = db.session.query(WorkspaceRepository.model).with_for_update().filter(WorkspaceRepository.model.id == workspace_id).first()
        if not workspace:
            raise NotFoundError("Workspace not found")
        workspace.is_deleted = False
        workspace.deleted_at = None
        workspace.deleted_by = None

        db.session.execute(
            update(Entity).where(
                Entity.workspace_id == str(workspace_id),
                Entity.is_deleted.is_(True),
            ).values(is_deleted=False, deleted_at=None, deleted_by=None)
        )

        db.session.execute(
            update(Block).where(
                Block.entity_id.in_(db.session.query(Entity.id).filter(Entity.workspace_id == str(workspace_id))),
                Block.is_deleted.is_(True),
            ).values(is_deleted=False, deleted_at=None, deleted_by=None)
        )

        db.session.execute(
            update(Relation).where(
                Relation.workspace_id == str(workspace_id),
                Relation.is_deleted.is_(True),
            ).values(is_deleted=False, deleted_at=None, deleted_by=None)
        )

        _cascade_restore_comment(workspace_id)

        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return workspace
