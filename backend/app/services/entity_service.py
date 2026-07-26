import hashlib
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError

from app.core.errors import ApiError, ConflictError, NotFoundError
from app.events.service import EventService
from app.extensions import db
from app.models import Block, Entity, EntityEvent, EntityPropertyValue, EntityTag, EntityType, Notification, Property, Relation, SearchDocument
from app.repositories import (
    BlockRepository,
    EntityFileRepository,
    EntityPropertyValueRepository,
    EntityRepository,
    EntityTagRepository,
    EntityTypeRepository,
    PropertyRepository,
    RelationRepository,
)

from app.core.logging import logger
from app.services.search_service import SearchService


def content_hash(payload: dict) -> str:
    """Compute a SHA-256 content hash for a dict payload."""
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


def _comment_model():
    try:
        from app.models import Comment as _m
        from sqlalchemy import inspect
        inspect(_m)
        return _m
    except Exception:
        return None


def _cascade_comment_update(entity_id, values, deleted_filter=True):
    Comment = _comment_model()
    if Comment is None:
        return
    try:
        Comment.query.filter(
            Comment.entity_id == str(entity_id),
            Comment.is_deleted.is_(deleted_filter),
        ).update(values)
    except Exception:
        pass


class EntityService:
    def __init__(self, entity_repo=None, entity_type_repo=None, block_repo=None,
                 property_value_repo=None, entity_tag_repo=None, entity_file_repo=None,
                 relation_repo=None, event_service=None, search_service=None,
                 property_repo=None):
        self.entity_repo = entity_repo or EntityRepository()
        self.entity_type_repo = entity_type_repo or EntityTypeRepository()
        self.block_repo = block_repo or BlockRepository()
        self.property_value_repo = property_value_repo or EntityPropertyValueRepository()
        self.entity_tag_repo = entity_tag_repo or EntityTagRepository()
        self.entity_file_repo = entity_file_repo or EntityFileRepository()
        self.relation_repo = relation_repo or RelationRepository()
        self.event_service = event_service or EventService()
        self.search_service = search_service or SearchService()
        self.property_repo = property_repo or PropertyRepository()

    def create_type(self, data: dict) -> dict:
        if not data.get("workspace_id"):
            raise ApiError("workspace_id is required", 400, "bad_request")
        if not data.get("name"):
            raise ApiError("name is required", 400, "bad_request")
        existing = self.entity_type_repo.query().with_for_update().filter_by(workspace_id=data["workspace_id"], name=data["name"]).first()
        if existing:
            raise ConflictError("Entity type already exists")
        entity_type = self.entity_type_repo.create(data)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Entity type already exists")
        except Exception:
            db.session.rollback()
            raise
        return {
            "id": str(entity_type.id),
            "workspace_id": str(entity_type.workspace_id),
            "name": entity_type.name,
            "slug": entity_type.slug,
            "icon": entity_type.icon,
            "description": entity_type.description,
            "color": entity_type.color,
            "config": entity_type.config,
            "created_at": entity_type.created_at.isoformat() if entity_type.created_at else None,
        }

    def create_property(self, data: dict) -> dict:
        if not data.get("workspace_id"):
            raise ApiError("workspace_id is required", 400, "bad_request")
        if not data.get("name"):
            raise ApiError("name is required", 400, "bad_request")
        if not data.get("type"):
            raise ApiError("type is required", 400, "bad_request")
        existing = Property.query.with_for_update().filter_by(workspace_id=data["workspace_id"], name=data["name"]).first()
        if existing:
            raise ConflictError("Property already exists")
        prop = self.property_repo.create(data)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Property already exists")
        except Exception:
            db.session.rollback()
            raise
        return {
            "id": str(prop.id),
            "workspace_id": str(prop.workspace_id),
            "entity_type_id": str(prop.entity_type_id) if prop.entity_type_id else None,
            "name": prop.name,
            "type": prop.type,
            "description": prop.description,
            "required": prop.required,
            "options": prop.options,
            "config": prop.config,
            "created_at": prop.created_at.isoformat() if prop.created_at else None,
        }

    def _ensure_entity_type(self, workspace_id: str) -> str:
        existing = EntityType.query.filter_by(workspace_id=workspace_id, is_deleted=False).first()
        if existing:
            return str(existing.id)
        entity_type = EntityType(
            workspace_id=workspace_id,
            name="Page",
            slug="page",
            icon="FileText",
            description="Default page type",
        )
        db.session.add(entity_type)
        db.session.flush()
        return str(entity_type.id)

    def create(self, data: dict, user_id: str) -> dict:
        if not data.get("workspace_id"):
            raise ApiError("workspace_id is required", 400, "bad_request")
        if not data.get("entity_type_id"):
            data["entity_type_id"] = self._ensure_entity_type(data["workspace_id"])
        properties = data.get("properties", {})
        if not isinstance(properties, dict):
            raise ApiError("properties must be a dict", 400, "bad_request")
        name = data.get("name")
        if name:
            existing = Entity.query.with_for_update().filter(
                Entity.workspace_id == data["workspace_id"],
                Entity.name == name,
                Entity.entity_type_id == data["entity_type_id"],
                Entity.is_deleted.is_(False),
            ).first()
            if existing:
                raise ConflictError("Entity already exists")
        filtered_data = {k: v for k, v in data.items() if k != "properties"}
        entity = self.entity_repo.create({**filtered_data, "created_by": user_id})
        try:
            db.session.flush()
        except Exception:
            db.session.rollback()
            raise
        self._upsert_properties(entity.id, properties)
        parent_id = filtered_data.get("parent_id") or data.get("parent_id")
        if parent_id:
            self.relation_repo.create({
                "source_id": str(parent_id),
                "target_id": str(entity.id),
                "type": "parent",
                "workspace_id": entity.workspace_id,
                "created_by": user_id,
            })
            try:
                db.session.flush()
            except Exception:
                db.session.rollback()
                raise
        self.event_service.entity_event(entity.id, user_id, entity.workspace_id, "entity.created", {"title": entity.name})
        self.search_service.update_entity_search_document(entity.id)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Entity already exists")
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(entity)

    def update(self, entity_id: str, data: dict, user_id: str) -> dict:
        entity = Entity.query.with_for_update().filter(Entity.id == entity_id).first()
        if not entity:
            raise NotFoundError("Entity not found")
        if not entity.workspace_id:
            raise ApiError("Entity has no workspace", 400, "bad_request")
        properties = data.get("properties", None)
        filtered_data = {k: v for k, v in data.items() if k != "properties"}
        self.entity_repo.update_with_version(entity, filtered_data)
        if properties is not None:
            self._upsert_properties(entity.id, properties)
        self.event_service.entity_event(entity.id, user_id, entity.workspace_id, "entity.updated", filtered_data)
        self.search_service.update_entity_search_document(entity_id)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Resource already exists")
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(entity)

    def soft_delete(self, entity_id: str, user_id: str = None) -> dict:
        entity = Entity.query.with_for_update().filter(Entity.id == entity_id, Entity.is_deleted.is_(False)).first()
        if not entity:
            raise NotFoundError("Entity not found")
        now = datetime.now(timezone.utc)
        self.entity_repo.soft_delete(entity, deleted_by=user_id)
        try:
            db.session.flush()
        except Exception:
            db.session.rollback()
            raise

        deleted_by_str = str(user_id) if user_id else None
        cascade_updates = [
            ("blocks", lambda: Block.query.filter(
                Block.entity_id == str(entity_id),
                Block.is_deleted.is_(False),
            ).update({"is_deleted": True, "deleted_at": now, "deleted_by": deleted_by_str})),
            ("properties", lambda: self.property_value_repo.query().filter_by(entity_id=str(entity_id)).update(
                {"is_deleted": True, "deleted_at": now, "deleted_by": deleted_by_str}
            )),
            ("tags", lambda: self.entity_tag_repo.query().filter_by(entity_id=str(entity_id)).update(
                {"is_deleted": True, "deleted_at": now, "deleted_by": deleted_by_str}
            )),
            ("files", lambda: self.entity_file_repo.query().filter_by(entity_id=str(entity_id)).update(
                {"is_deleted": True, "deleted_at": now, "deleted_by": deleted_by_str}
            )),
            ("comments", lambda: _cascade_comment_update(entity_id, {"is_deleted": True, "deleted_at": now, "deleted_by": deleted_by_str}, deleted_filter=False) if _comment_model() else None),
            ("notifications", lambda: Notification.query.filter(
                Notification.entity_id == str(entity_id),
                Notification.is_deleted.is_(False),
            ).update({"is_deleted": True, "deleted_at": now, "deleted_by": deleted_by_str})),
            ("search_documents", lambda: SearchDocument.query.filter(
                SearchDocument.entity_id == str(entity_id),
                SearchDocument.is_deleted.is_(False),
            ).update({"is_deleted": True, "deleted_at": now, "deleted_by": deleted_by_str})),
        ]

        try:
            for rel in self.relation_repo.query().filter(
                db.or_(
                    Relation.source_id == str(entity_id),
                    Relation.target_id == str(entity_id),
                )
            ).all():
                self.relation_repo.soft_delete(rel, deleted_by=user_id)
        except Exception as e:
            logger.warning("entity_cascade_delete_failed", entity_id=entity_id, target="relations", error=str(e))
            raise

        for name, op in cascade_updates:
            try:
                op()
            except Exception as e:
                logger.warning("entity_cascade_delete_failed", entity_id=entity_id, target=name, error=str(e))
                raise

        self.event_service.entity_event(entity.id, user_id or "", entity.workspace_id, "entity.deleted", {})
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(entity)

    def restore(self, entity_id: str, user_id: str = None) -> dict:
        """Restore a soft-deleted entity and cascade restore to related records."""
        entity = Entity.query.with_for_update().filter(Entity.id == entity_id).first()
        if not entity:
            raise NotFoundError("Entity not found")
        entity.is_deleted = False
        entity.deleted_at = None
        entity.deleted_by = None

        Block.query.filter(
            Block.entity_id == str(entity_id),
            Block.is_deleted.is_(True),
        ).update({"is_deleted": False, "deleted_at": None, "deleted_by": None})

        self.property_value_repo.query().filter_by(entity_id=str(entity_id), is_deleted=True).update(
            {"is_deleted": False, "deleted_at": None, "deleted_by": None}
        )

        for rel in self.relation_repo.query(include_deleted=True).filter(
            db.or_(
                Relation.source_id == str(entity_id),
                Relation.target_id == str(entity_id),
            ),
            Relation.is_deleted.is_(True),
        ).all():
            rel.is_deleted = False
            rel.deleted_at = None
            rel.deleted_by = None

        self.entity_tag_repo.query(include_deleted=True).filter_by(entity_id=str(entity_id), is_deleted=True).update(
            {"is_deleted": False, "deleted_at": None, "deleted_by": None}
        )

        self.entity_file_repo.query(include_deleted=True).filter_by(entity_id=str(entity_id), is_deleted=True).update(
            {"is_deleted": False, "deleted_at": None, "deleted_by": None}
        )

        _cascade_comment_update(entity_id, {"is_deleted": False, "deleted_at": None, "deleted_by": None}, deleted_filter=True)

        Notification.query.filter(
            Notification.entity_id == str(entity_id),
            Notification.is_deleted.is_(True),
        ).update({"is_deleted": False, "deleted_at": None, "deleted_by": None})

        self.event_service.entity_event(entity.id, user_id or "", entity.workspace_id, "entity.restored", {})
        self.search_service.update_entity_search_document(entity_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(entity)

    def get_children(self, entity_id: str, page: int = 1, per_page: int = 30) -> dict:
        child_ids = (
            self.relation_repo.query()
            .filter_by(source_id=entity_id, type="parent")
            .all()
        )
        target_ids = [r.target_id for r in child_ids]
        if not target_ids:
            pagination = self.entity_repo.query().filter(Entity.id.is_(None)).paginate(page=page, per_page=per_page, error_out=False)
        else:
            pagination = self.entity_repo.query().filter(Entity.id.in_(target_ids)).paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [self._to_dict(e) for e in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def archive(self, entity_id: str, archived: bool = True, user_id: str = None) -> dict:
        entity = Entity.query.with_for_update().filter(Entity.id == entity_id, Entity.is_deleted.is_(False)).first()
        if not entity:
            raise NotFoundError("Entity not found")
        entity.is_archived = archived
        self.event_service.entity_event(entity.id, user_id or "", entity.workspace_id, "entity.archived" if archived else "entity.unarchived", {})
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(entity)

    def duplicate(self, entity_id: str, user_id: str) -> dict:
        """Duplicate an entity with a 'Copy' suffix title."""
        source = Entity.query.with_for_update().filter(Entity.id == entity_id, Entity.is_deleted.is_(False)).first()
        if not source:
            raise NotFoundError("Entity not found")
        duplicate = self.entity_repo.create(
            {
                "workspace_id": source.workspace_id,
                "entity_type_id": source.entity_type_id,
                "name": f"{source.name or 'Untitled'} Copy",
                "icon": source.icon,
                "cover_image": source.cover_image,
                "created_by": user_id,
            }
        )
        try:
            db.session.flush()
        except Exception:
            db.session.rollback()
            raise

        for block in Block.query.filter_by(entity_id=entity_id, is_deleted=False).order_by(Block.position).all():
            new_block = Block(
                entity_id=duplicate.id,
                branch_id=block.branch_id,
                parent_block_id=block.parent_block_id,
                type=block.type,
                content=block.content,
                position=block.position,
                indent=block.indent,
                content_hash=block.content_hash,
            )
            db.session.add(new_block)

        for pv in EntityPropertyValue.query.filter_by(entity_id=entity_id, is_deleted=False).all():
            new_pv = EntityPropertyValue(entity_id=duplicate.id, property_id=pv.property_id, value=pv.value)
            db.session.add(new_pv)

        for et in EntityTag.query.filter_by(entity_id=entity_id, is_deleted=False).all():
            new_et = EntityTag(entity_id=duplicate.id, tag_id=et.tag_id)
            db.session.add(new_et)

        self.event_service.entity_event(source.id, user_id, source.workspace_id, "entity.duplicated", {"duplicate_id": str(duplicate.id)})
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Entity duplicate already exists")
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(duplicate)

    def _upsert_properties(self, entity_id: str, values: dict) -> None:

        # Batch-load existing values for this entity to avoid per-key queries
        existing_values = {
            str(v.property_id): v
            for v in EntityPropertyValue.query.with_for_update().filter(
                EntityPropertyValue.entity_id == entity_id
            ).all()
        } if values else {}

        entity = None
        for key, value in values.items():
            try:
                uuid.UUID(key)
                prop = self.property_repo.get(key)
                if not prop:
                    raise ApiError(f"Property ID '{key}' not found", 404, "not_found")
                property_id = prop.id
            except ValueError:
                if entity is None:
                    entity = self.entity_repo.get(entity_id)
                if not entity:
                    raise ApiError("Entity not found for property upsert", 404, "not_found")
                prop = self.property_repo.query().filter_by(
                    workspace_id=entity.workspace_id, name=key
                ).first()
                if not prop:
                    raise ApiError(f"Property '{key}' not found", 404, "not_found")
                property_id = prop.id
            existing = existing_values.get(str(property_id))
            if existing:
                existing.value = value
            else:
                self.property_value_repo.create({"entity_id": entity_id, "property_id": property_id, "value": value})

    def list_by_workspace(self, workspace_id: str, page: int = 1, per_page: int = 50,
                          include_archived: bool = False, entity_type_id: str = None) -> dict:
        query = self.entity_repo.query().filter(
            Entity.workspace_id == workspace_id,
            Entity.is_deleted.is_(False),
        )
        if not include_archived:
            query = query.filter(Entity.is_archived.is_(False))
        if entity_type_id:
            query = query.filter(Entity.entity_type_id == entity_type_id)
        query = query.order_by(Entity.updated_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [self._to_dict(e) for e in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def get_with_blocks(self, entity_id: str) -> dict:
        entity = self.entity_repo.get(entity_id)
        if not entity:
            raise NotFoundError("Entity not found")
        result = self._to_dict(entity)
        blocks = Block.query.filter(
            Block.entity_id == entity_id,
            Block.is_deleted.is_(False),
        ).order_by(Block.position.asc()).all()
        result["blocks"] = [
            {
                "id": str(b.id),
                "type": b.type,
                "content": b.content,
                "position": b.position,
                "parent_block_id": str(b.parent_block_id) if b.parent_block_id else None,
                "indent": b.indent,
            }
            for b in blocks
        ]
        return result

    @staticmethod
    def _to_dict(entity) -> dict:
        return {
            "id": str(entity.id),
            "workspace_id": str(entity.workspace_id) if entity.workspace_id else None,
            "entity_type_id": str(entity.entity_type_id) if entity.entity_type_id else None,
            "name": entity.name,
            "icon": entity.icon,
            "color": entity.color if hasattr(entity, 'color') else None,
            "cover_image": entity.cover_image,
            "parent_id": str(entity.parent_id) if entity.parent_id else None,
            "sort_order": entity.sort_order if hasattr(entity, 'sort_order') else 0,
            "summary": entity.summary if hasattr(entity, 'summary') else None,
            "properties": {
                pv.property_id: pv.value for pv in entity.properties
            } if hasattr(entity, 'properties') and entity.properties else None,
            "is_favorite": entity.is_favorite if hasattr(entity, 'is_favorite') else False,
            "is_archived": entity.is_archived,
            "archived_at": entity.archived_at.isoformat() if hasattr(entity, 'archived_at') and entity.archived_at else None,
            "is_deleted": entity.is_deleted if hasattr(entity, 'is_deleted') else False,
            "deleted_at": entity.deleted_at.isoformat() if hasattr(entity, 'deleted_at') and entity.deleted_at else None,
            "deleted_by": str(entity.deleted_by) if hasattr(entity, 'deleted_by') and entity.deleted_by else None,
            "created_by": str(entity.created_by) if entity.created_by else None,
            "version": entity.version if hasattr(entity, 'version') else 1,
            "block_count": entity.block_count if hasattr(entity, 'block_count') else 0,
            "created_at": entity.created_at.isoformat() if entity.created_at else None,
            "updated_at": entity.updated_at.isoformat() if entity.updated_at else None,
        }

    def permanent_delete(self, entity_id: str, user_id: str = None) -> dict:
        entity = Entity.query.filter(Entity.id == entity_id).first()
        if not entity:
            raise NotFoundError("Entity not found")
        if not entity.is_deleted:
            raise ApiError("Entity must be soft-deleted before permanent deletion", 400, "bad_request")

        related_ids = {
            "block_ids": [r.id for r in Block.query.filter_by(entity_id=entity_id).all()],
        }

        Block.query.filter(Block.entity_id == entity_id).delete()
        self.property_value_repo.query(include_deleted=True).filter_by(entity_id=entity_id).delete()
        self.entity_tag_repo.query(include_deleted=True).filter_by(entity_id=entity_id).delete()
        self.entity_file_repo.query(include_deleted=True).filter_by(entity_id=entity_id).delete()
        SearchDocument.query.filter(SearchDocument.entity_id == entity_id).delete()

        for rel in self.relation_repo.query(include_deleted=True).filter(
            db.or_(
                Relation.source_id == entity_id,
                Relation.target_id == entity_id,
            )
        ).all():
            db.session.delete(rel)

        if _comment_model():
            Comment = _comment_model()
            Comment.query.filter(Comment.entity_id == entity_id).delete()

        Notification.query.filter(Notification.entity_id == entity_id).delete()
        EntityEvent.query.filter(EntityEvent.entity_id == entity_id).delete(synchronize_session="fetch")

        db.session.delete(entity)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return {"id": entity_id, "permanently_deleted": True, "related_ids": related_ids}

    @staticmethod
    def flatten_properties(entity_id: str) -> dict:
        """Flatten property values for an entity into a name->value dict."""
        rows = (
            EntityPropertyValueRepository().query()
            .filter_by(entity_id=entity_id)
            .all()
        )
        if not rows:
            return {}
        prop_ids = {r.property_id for r in rows}
        props = Property.query.filter(Property.id.in_(prop_ids)).all()
        name_map = {str(p.id): p.name for p in props}
        return {name_map.get(str(r.property_id), str(r.property_id)): r.value for r in rows}
