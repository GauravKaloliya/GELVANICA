from datetime import datetime, timezone

from app.core.errors import ApiError, ConflictError, NotFoundError
from app.events.service import EventService
from app.extensions import db
from app.models import Block, Entity
from app.repositories import BlockRepository, EntityRepository

from app.core.sanitization import sanitize_html, sanitize_url
from app.services.search_service import SearchService


class BlockService:
    def __init__(self, block_repo=None, entity_repo=None, event_service=None, search_service=None):
        self.block_repo = block_repo or BlockRepository()
        self.entity_repo = entity_repo or EntityRepository()
        self.event_service = event_service or EventService()
        self.search_service = search_service or SearchService()

    @staticmethod
    def _sanitize_content(content):
        """Sanitize rich text and URLs in block content."""
        if not isinstance(content, dict):
            return content
        sanitized = dict(content)
        for key in ("text", "title", "caption", "alt"):
            if key in sanitized and isinstance(sanitized[key], str):
                sanitized[key] = sanitize_html(sanitized[key])
        for key in ("url", "href", "src"):
            if key in sanitized and isinstance(sanitized[key], str):
                try:
                    sanitized[key] = sanitize_url(sanitized[key])
                except ValueError:
                    sanitized[key] = ""
        return sanitized

    def list_by_entity(self, entity_id: str) -> list:
        blocks = self.block_repo.query().filter(
            Block.entity_id == entity_id,
            Block.is_deleted.is_(False),
        ).order_by(Block.position.asc()).all()
        return [self._to_dict(b) for b in blocks]

    @staticmethod
    def _to_dict(block) -> dict:
        return {
            "id": str(block.id),
            "entity_id": str(block.entity_id) if block.entity_id else None,
            "branch_id": str(block.branch_id) if block.branch_id else None,
            "parent_block_id": str(block.parent_block_id) if block.parent_block_id else None,
            "type": block.type,
            "content": block.content,
            "properties": block.properties if hasattr(block, 'properties') else None,
            "position": block.position,
            "indent": block.indent,
            "content_hash": block.content_hash,
            "version": block.version,
            "is_deleted": block.is_deleted if hasattr(block, 'is_deleted') else False,
            "deleted_at": block.deleted_at.isoformat() if hasattr(block, 'deleted_at') and block.deleted_at else None,
            "deleted_by": str(block.deleted_by) if hasattr(block, 'deleted_by') and block.deleted_by else None,
            "created_at": block.created_at.isoformat() if block.created_at else None,
            "updated_at": block.updated_at.isoformat() if block.updated_at else None,
        }

    def _check_circular_ref(self, block_id: str, parent_block_id: str) -> None:
        if str(block_id) == str(parent_block_id):
            raise ConflictError("A block cannot be its own parent")
        visited = {str(block_id)}
        current = parent_block_id
        depth = 0
        while current and depth < 100:
            if str(current) in visited:
                raise ConflictError("Circular reference detected in block parent chain")
            visited.add(str(current))
            parent = self.block_repo.get(current, include_deleted=True)
            current = parent.parent_block_id if parent else None
            depth += 1

    def create(self, data: dict, user_id: str) -> dict:
        if "entity_id" not in data:
            raise ApiError("entity_id is required", 400, "bad_request")
        if "type" not in data:
            raise ApiError("type is required", 400, "bad_request")
        if "content" in data and isinstance(data["content"], dict):
            data["content"] = self._sanitize_content(data["content"])
        entity = Entity.query.with_for_update().filter(Entity.id == data["entity_id"]).first()
        if not entity:
            raise NotFoundError("Entity not found")
        if data.get("branch_id") is None:
            data.pop("branch_id", None)
        parent_id = data.get("parent_block_id")
        if parent_id:
            parent = self.block_repo.get(parent_id)
            if not parent:
                raise NotFoundError("Parent block not found")
        if data.get("position") is None:
            data["position"] = self.block_repo.next_position(data["entity_id"], data.get("parent_block_id"))
        block = self.block_repo.create(data)
        entity.updated_at = datetime.now(timezone.utc)
        self.event_service.entity_event(entity.id, user_id, entity.workspace_id, "block.created", {"block_id": str(block.id), "type": block.type})
        self.search_service.update_entity_search_document(block.entity_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(block)

    def update(self, block_id: str, data: dict, user_id: str) -> dict:
        block = Block.query.with_for_update().filter(Block.id == block_id).first()
        if not block:
            raise NotFoundError("Block not found")
        parent_id = data.get("parent_block_id")
        if parent_id:
            self._check_circular_ref(block_id, parent_id)
        if "content" in data and isinstance(data["content"], dict):
            data["content"] = self._sanitize_content(data["content"])
        entity = Entity.query.with_for_update().filter(Entity.id == block.entity_id).first()
        if not entity:
            raise NotFoundError("Entity not found")
        new_block = self.block_repo.update_with_version(block, data)
        entity.updated_at = datetime.now(timezone.utc)
        self.event_service.entity_event(entity.id, user_id, entity.workspace_id, "block.updated", {"block_id": str(block.id)})
        self.search_service.update_entity_search_document(new_block.entity_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(new_block)

    def move(self, block_id: str, data: dict, new_entity_id: str | None = None, user_id=None):
        if not data:
            raise ApiError("Request body is required", 400, "bad_request")
        block = Block.query.filter_by(id=block_id).with_for_update().first()
        if not block:
            raise NotFoundError("Block not found")
        entity = Entity.query.with_for_update().filter(Entity.id == block.entity_id).first()
        if not entity:
            raise NotFoundError("Entity not found")
        new_entity_id = new_entity_id or data.get("entity_id")
        if new_entity_id and str(new_entity_id) != str(block.entity_id):
            target_entity = Entity.query.with_for_update().filter(Entity.id == new_entity_id).first()
            if not target_entity:
                raise NotFoundError(f"Target entity {new_entity_id} not found")
            target_entity.updated_at = datetime.now(timezone.utc)
        new_parent_id = data.get("parent_block_id", block.parent_block_id)
        if new_parent_id and str(new_parent_id) != str(block.parent_block_id):
            self._check_circular_ref(block_id, new_parent_id)
        new_position = data.get("position")
        if new_position is None:
            raise ApiError("position is required", 400)
        update_data = {
            "parent_block_id": new_parent_id,
            "position": new_position,
        }
        if new_entity_id:
            update_data["entity_id"] = new_entity_id
        if "indent" in data:
            update_data["indent"] = data["indent"]
        new_block = self.block_repo.update_with_version(block, update_data)
        event_entity_id = new_entity_id or block.entity_id
        entity.updated_at = datetime.now(timezone.utc)
        self.event_service.entity_event(event_entity_id, user_id or "", entity.workspace_id, "block.moved", {"block_id": str(new_block.id)})
        self.search_service.update_entity_search_document(block.entity_id)
        if new_entity_id:
            self.search_service.update_entity_search_document(new_entity_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(new_block)

    def reorder(self, entity_id: str, block_order: list[dict]) -> list[dict]:
        entity = Entity.query.with_for_update().filter(Entity.id == entity_id).first()
        if not entity:
            raise NotFoundError("Entity not found")
        if not block_order:
            raise ApiError("block_order is required", 400, "bad_request")
        block_ids = []
        for item in block_order:
            bid = str(item.get("id", ""))
            if not bid:
                raise ApiError("Each block must have an 'id'", 400, "bad_request")
            block_ids.append(bid)
        blocks = self.block_repo.query().filter(
            Block.id.in_(block_ids), Block.entity_id == str(entity_id)
        ).with_for_update().all()
        blocks_by_id = {str(b.id): b for b in blocks}
        updated = []
        for item in block_order:
            bid = str(item.get("id", ""))
            block = blocks_by_id.get(bid)
            position = item.get("position")
            if block and position is not None:
                block.position = position
                updated.append(block)
        entity.updated_at = datetime.now(timezone.utc)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return [self._to_dict(b) for b in updated]

    def delete(self, block_id: str, user_id: str | None = None) -> dict:
        block = Block.query.with_for_update().filter(Block.id == block_id).first()
        if not block:
            raise NotFoundError("Block not found")
        entity = self.entity_repo.get(block.entity_id)
        if not entity:
            raise NotFoundError("Entity not found")
        deleted = self.block_repo.soft_delete(block, deleted_by=user_id)
        entity.updated_at = datetime.now(timezone.utc)
        self.event_service.entity_event(block.entity_id, user_id or "", entity.workspace_id, "block.deleted", {"block_id": str(block.id)})
        self.search_service.update_entity_search_document(block.entity_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(deleted)

    def restore(self, block_id: str, user_id: str = None) -> dict:
        block = Block.query.with_for_update().filter(Block.id == block_id).first()
        if not block:
            raise NotFoundError("Block not found")
        block.is_deleted = False
        block.deleted_at = None
        block.deleted_by = None
        entity = self.entity_repo.get(block.entity_id)
        if not entity:
            raise NotFoundError("Entity not found")
        entity.updated_at = datetime.now(timezone.utc)
        self.event_service.entity_event(block.entity_id, user_id or "", entity.workspace_id, "block.restored", {"block_id": str(block.id)})
        self.search_service.update_entity_search_document(block.entity_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(block)
