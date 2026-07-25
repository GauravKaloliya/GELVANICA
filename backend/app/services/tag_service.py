from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.exc import IntegrityError

from app.core.errors import ApiError, ConflictError, NotFoundError
from app.core.logging import logger
from app.extensions import db
from app.models import EntityTag, Tag
from app.repositories import TagRepository


class TagService:

    @staticmethod
    def _to_dict(tag) -> dict:
        return {
            "id": str(tag.id),
            "workspace_id": str(tag.workspace_id) if tag.workspace_id else None,
            "name": tag.name,
            "color": tag.color,
            "entity_count": tag.entity_count if hasattr(tag, 'entity_count') else 0,
            "is_deleted": tag.is_deleted if hasattr(tag, 'is_deleted') else False,
            "deleted_at": tag.deleted_at.isoformat() if hasattr(tag, 'deleted_at') and tag.deleted_at else None,
            "deleted_by": str(tag.deleted_by) if hasattr(tag, 'deleted_by') and tag.deleted_by else None,
            "created_at": tag.created_at.isoformat() if tag.created_at else None,
            "updated_at": tag.updated_at.isoformat() if hasattr(tag, 'updated_at') and tag.updated_at else None,
        }

    def list_by_workspace(self, workspace_id: str, page: int = 1, per_page: int = 50) -> dict:
        query = TagRepository().query().filter(
            Tag.workspace_id == workspace_id,
            Tag.is_deleted.is_(False),
        ).order_by(Tag.name.asc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [self._to_dict(t) for t in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def get_entity_tags(self, entity_id: str) -> list:
        etags = EntityTag.query.filter_by(entity_id=entity_id, is_deleted=False).all()
        tag_ids = [et.tag_id for et in etags]
        if not tag_ids:
            return []
        tags = Tag.query.filter(Tag.id.in_(tag_ids), Tag.is_deleted.is_(False)).all()
        return [self._to_dict(t) for t in tags]

    def create(self, data: Dict[str, Any]) -> dict:
        """Create a new tag.

        Args:
            data: Tag data including name, workspace_id, etc.

        Returns:
            The newly created tag.

        Raises:
            ApiError: If tag name is missing or empty.
        """
        if not data.get("name") or not data["name"].strip():
            raise ApiError("Tag name is required", 400, "VALIDATION_ERROR")
        if not data.get("workspace_id"):
            raise ApiError("workspace_id is required", 400, "VALIDATION_ERROR")
        existing = Tag.query.with_for_update().filter_by(workspace_id=data["workspace_id"], name=data["name"].strip(), is_deleted=False).first()
        if existing:
            raise ConflictError("Tag already exists")
        tag = TagRepository().create(data)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Tag already exists")
        logger.info("tag_created", extra={"tag_id": str(tag.id), "name": data.get("name"), "workspace_id": data.get("workspace_id")})
        return self._to_dict(tag)

    def update(self, tag_id: str, data: Dict[str, Any]) -> dict:
        """Update an existing tag.

        Args:
            tag_id: The tag to update.
            data: Update data (e.g. name, color).

        Returns:
            The updated tag.

        Raises:
            ApiError: If no update data provided.
        """
        if not data:
            raise ApiError("No update data provided", 400, "VALIDATION_ERROR")
        repo = TagRepository()
        tag = repo.get(tag_id)
        if not tag:
            raise NotFoundError("Tag not found")
        repo.update(tag, data)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("tag_updated", extra={"tag_id": tag_id, "workspace_id": str(tag.workspace_id)})
        return self._to_dict(tag)

    def delete(self, tag_id: str, user_id: Optional[str] = None) -> dict:
        """Soft-delete a tag.

        Args:
            tag_id: The tag to delete.
            user_id: The user performing the deletion.

        Returns:
            The soft-deleted tag.
        """
        tag = TagRepository().get(tag_id)
        if not tag:
            raise NotFoundError("Tag not found")
        TagRepository().soft_delete(tag, deleted_by=user_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("tag_deleted", extra={"tag_id": tag_id, "user_id": user_id})
        return self._to_dict(tag)

    def restore(self, tag_id: str) -> dict:
        """Restore a soft-deleted tag.

        Args:
            tag_id: The tag to restore.

        Returns:
            The restored tag.
        """
        tag = TagRepository().get(tag_id, include_deleted=True)
        if not tag:
            raise NotFoundError("Tag not found")
        tag.is_deleted = False
        tag.deleted_at = None
        tag.deleted_by = None
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(tag)

    def tag_entity(self, entity_id: str, tag_id: str) -> dict:
        """Associate a tag with an entity."""
        existing = EntityTag.query.with_for_update().filter_by(entity_id=entity_id, tag_id=tag_id, is_deleted=False).first()
        if existing:
            return {"entity_id": str(existing.entity_id), "tag_id": str(existing.tag_id)}
        et = EntityTag(entity_id=entity_id, tag_id=tag_id)
        db.session.add(et)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return {"entity_id": str(et.entity_id), "tag_id": str(et.tag_id)}

    def untag_entity(self, entity_id: str, tag_id: str) -> dict:
        """Remove the association between a tag and an entity."""
        et = EntityTag.query.with_for_update().filter_by(entity_id=entity_id, tag_id=tag_id, is_deleted=False).first()
        if et:
            et.is_deleted = True
            et.deleted_at = datetime.now(timezone.utc)
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
                raise
        return {"untagged": True}