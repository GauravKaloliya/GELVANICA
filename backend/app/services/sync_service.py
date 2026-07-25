from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Block, Entity, EntityPropertyValue, EntityType, File, Property, Relation, SyncOperation, Tag, Workspace
from app.core.errors import ConflictError, NotFoundError
from app.core.logging import logger
from app.repositories.domain import SyncOperationRepository

ENTITY_TYPE_FIELDS: set[str] = {"name", "description", "icon", "color", "config"}
TAG_FIELDS: set[str] = {"name", "color", "description"}
PROPERTY_FIELDS: set[str] = {"name", "type", "description", "required", "options", "metadata"}
ENTITY_FIELDS: set[str] = {"name", "entity_type_id", "icon", "cover_image", "is_archived", "metadata"}
RELATION_FIELDS: set[str] = {"source_id", "target_id", "type", "properties"}
BLOCK_FIELDS: set[str] = {"entity_id", "type", "content", "parent_block_id", "position", "branch_id", "metadata"}
COMMENT_FIELDS: set[str] = {"entity_id", "content", "block_id", "parent_id"}

CLOUD_API_URL = None


def _sync_comment_model():
    try:
        from app.models import Comment as _m
        from sqlalchemy import inspect
        inspect(_m)
        return _m
    except Exception:
        return None


def _get_cloud_api_url() -> Optional[str]:
    global CLOUD_API_URL
    if CLOUD_API_URL is None:
        try:
            from flask import current_app
            CLOUD_API_URL = current_app.config.get("CLOUD_API_URL", "https://api.gnovium.com")
        except Exception:
            CLOUD_API_URL = "https://api.gnovium.com"
    return CLOUD_API_URL


def _is_cloud_mode() -> bool:
    try:
        from flask import current_app
        return current_app.config.get("GNOVIUM_MODE") == "cloud"
    except Exception:
        import os
        return os.environ.get("GNOVIUM_MODE", "local").strip().lower() == "cloud"


class SyncConflict(Exception):
    def __init__(self, message: str, conflicts: list):
        self.conflicts = conflicts
        super().__init__(message)


class SyncService:
    def ingest(self, data: dict[str, Any], user_id: str) -> Any:
        """Record an incoming sync operation from a client device."""
        workspace_id = data.get("workspace_id")
        if workspace_id:
            db.session.query(Workspace).filter(Workspace.id == workspace_id).with_for_update().first()
            ws = Workspace.query.filter(Workspace.id == workspace_id).first()
            if ws and hasattr(ws, 'sync_enabled') and hasattr(ws, 'deployment_mode'):
                if not ws.sync_enabled:
                    raise ValueError("Sync is disabled for this workspace")
                if ws.deployment_mode and ws.deployment_mode != _is_cloud_mode() and _is_cloud_mode():
                    raise ValueError("Sync mode mismatch: workspace deployment mode differs")
        existing = SyncOperation.query.with_for_update().filter_by(
            workspace_id=workspace_id,
            operation_type=data.get("operation_type"),
            device_id=data.get("device_id"),
            synced=False,
            is_deleted=False,
        ).first()
        if existing:
            return existing
        op = SyncOperationRepository().create(data)
        conflicts = []
        try:
            self._apply_sync_operation(op, conflicts)
            if conflicts:
                op.synced = False
                op.error_message = str(conflicts)
            else:
                op.synced = True
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Sync operation already exists") from None
        except Exception:
            db.session.rollback()
            logger.exception("sync_ingest_failed", extra={"op_id": str(op.id)})
            raise
        return op

    def _get_client_clock(self, op) -> int:
        return op.client_clock if op.client_clock is not None else 0

    def _is_entity_stale(self, client_clock: int, entity) -> bool:
        if client_clock is None or not entity:
            return False
        updated_at = getattr(entity, 'updated_at', None)
        if updated_at:
            return client_clock < updated_at.timestamp()
        return False

    def _check_tombstone_conflict(self, client_clock: int, entity_id, model_class):
        if not entity_id or not client_clock:
            return None
        existing = model_class.query.with_for_update().filter(model_class.id == entity_id).first()
        if existing and existing.is_deleted and existing.deleted_at:
            if client_clock < existing.deleted_at.timestamp():
                return existing
        return None

    def _update_entity_clock(self, entity, client_clock: int):
        if hasattr(entity, 'updated_at'):
            entity.updated_at = datetime.fromtimestamp(client_clock, tz=timezone.utc)
        if hasattr(entity, 'version'):
            entity.version = (entity.version or 0) + 1

    def _apply_sync_operation(self, op, conflicts: list = None):
        """Apply a sync operation to the actual data with conflict detection."""
        if conflicts is None:
            conflicts = []
        op_type = op.operation_type
        payload = op.payload or {}
        client_clock = self._get_client_clock(op)

        try:
            handled = True

            # ── Tombstone check for create operations ──
            if op_type.startswith("create_"):
                entity_id = payload.get("id")
                if entity_id:
                    model_map = {
                        "create_entity": Entity, "create_block": Block,
                        "create_relation": Relation, "create_tag": Tag,
                        "create_property_value": EntityPropertyValue,
                        "create_comment": _sync_comment_model(), "create_file": File,
                        "create_entity_type": EntityType,
                    }
                    model = model_map.get(op_type)
                    if model:
                        tombstone = self._check_tombstone_conflict(client_clock, entity_id, model)
                        if tombstone:
                            conflicts.append({
                                "type": "tombstone", "id": entity_id,
                                "reason": f"{op_type} arrives after entity was deleted"
                            })
                            handled = True
                            return conflicts

            # ── Conflict check for update/delete operations ──
            if op_type.startswith("update_") or op_type.startswith("delete_"):
                entity_id = payload.get("id")
                if entity_id:
                    _comment_model_lazy = _sync_comment_model()
                    entity_map = {
                        "update_entity": Entity, "delete_entity": Entity,
                        "update_block": Block, "delete_block": Block,
                        "update_relation": Relation, "delete_relation": Relation,
                        "update_tag": Tag, "delete_tag": Tag,
                        "update_property_value": EntityPropertyValue, "delete_property_value": EntityPropertyValue,
                        "update_comment": _comment_model_lazy, "delete_comment": _comment_model_lazy,
                        "update_file": File, "delete_file": File,
                        "update_entity_type": EntityType, "delete_entity_type": EntityType,
                    }
                    model = entity_map.get(op_type)
                    if model:
                        existing = model.query.with_for_update().filter(model.id == entity_id).first()
                        if existing and self._is_entity_stale(client_clock, existing):
                            conflicts.append({
                                "type": "stale_update", "id": entity_id,
                                "field": "entity",
                                "reason": "Operation clock is older than entity updated_at"
                            })
                            handled = True
                            return conflicts

            # ── Apply operations ──
            if op_type == "create_entity":
                entity_id = payload.get("id")
                if entity_id:
                    existing = Entity.query.with_for_update().filter(Entity.id == entity_id).first()
                    if existing:
                        if existing.is_deleted:
                            existing.is_deleted = False
                            existing.deleted_at = None
                            existing.deleted_by = None
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at", "is_deleted", "deleted_at", "deleted_by"):
                                    setattr(existing, key, value)
                        else:
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at"):
                                    setattr(existing, key, value)
                    else:
                        filtered = {k: v for k, v in payload.items() if hasattr(Entity, k)}
                        entity = Entity(**filtered)
                        db.session.add(entity)
                else:
                    filtered = {k: v for k, v in payload.items() if hasattr(Entity, k)}
                    entity = Entity(**filtered)
                    db.session.add(entity)
                self._update_entity_clock(
                    Entity.query.filter(Entity.id == payload.get("id")).first() if payload.get("id") else entity,
                    client_clock or int(datetime.now(timezone.utc).timestamp())
                )

            elif op_type == "update_entity":
                entity = Entity.query.with_for_update().filter(Entity.id == payload.get("id")).first()
                if entity:
                    for key, value in payload.items():
                        if hasattr(entity, key) and key not in ("id", "created_at"):
                            setattr(entity, key, value)
                    self._update_entity_clock(entity, client_clock)
            elif op_type == "delete_entity":
                entity = Entity.query.with_for_update().filter(Entity.id == payload.get("id")).first()
                if entity:
                    entity.is_deleted = True
                    entity.deleted_at = datetime.now(timezone.utc)
            elif op_type == "create_block":
                block_id = payload.get("id")
                if block_id:
                    existing = Block.query.with_for_update().filter(Block.id == block_id).first()
                    if existing:
                        if existing.is_deleted:
                            existing.is_deleted = False
                            existing.deleted_at = None
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at", "is_deleted", "deleted_at"):
                                    setattr(existing, key, value)
                        else:
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at"):
                                    setattr(existing, key, value)
                    else:
                        filtered = {k: v for k, v in payload.items() if hasattr(Block, k)}
                        block = Block(**filtered)
                        db.session.add(block)
                else:
                    filtered = {k: v for k, v in payload.items() if hasattr(Block, k)}
                    block = Block(**filtered)
                    db.session.add(block)
                self._update_entity_clock(
                    Block.query.filter(Block.id == payload.get("id")).first() if payload.get("id") else block,
                    client_clock or int(datetime.now(timezone.utc).timestamp())
                )

            elif op_type == "update_block":
                block = Block.query.with_for_update().filter(Block.id == payload.get("id")).first()
                if block:
                    for key, value in payload.items():
                        if hasattr(block, key) and key not in ("id", "created_at"):
                            setattr(block, key, value)
                    self._update_entity_clock(block, client_clock)
            elif op_type == "delete_block":
                block = Block.query.with_for_update().filter(Block.id == payload.get("id")).first()
                if block:
                    block.is_deleted = True
                    block.deleted_at = datetime.now(timezone.utc)
            elif op_type == "create_relation":
                relation_id = payload.get("id")
                if relation_id:
                    existing = Relation.query.with_for_update().filter(Relation.id == relation_id).first()
                    if existing:
                        if existing.is_deleted:
                            existing.is_deleted = False
                            existing.deleted_at = None
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at", "is_deleted", "deleted_at"):
                                    setattr(existing, key, value)
                        else:
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at"):
                                    setattr(existing, key, value)
                    else:
                        filtered = {k: v for k, v in payload.items() if hasattr(Relation, k)}
                        relation = Relation(**filtered)
                        db.session.add(relation)
                else:
                    filtered = {k: v for k, v in payload.items() if hasattr(Relation, k)}
                    relation = Relation(**filtered)
                    db.session.add(relation)
            elif op_type == "delete_relation":
                relation = Relation.query.with_for_update().filter(Relation.id == payload.get("id")).first()
                if relation:
                    relation.is_deleted = True
                    relation.deleted_at = datetime.now(timezone.utc)
            elif op_type == "update_relation":
                relation = Relation.query.with_for_update().filter(Relation.id == payload.get("id")).first()
                if relation:
                    for key, value in payload.items():
                        if hasattr(relation, key) and key not in ("id", "created_at"):
                            setattr(relation, key, value)
            elif op_type == "create_tag":
                tag_id = payload.get("id")
                if tag_id:
                    existing = Tag.query.with_for_update().filter(Tag.id == tag_id).first()
                    if existing:
                        if existing.is_deleted:
                            existing.is_deleted = False
                            existing.deleted_at = None
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at", "is_deleted", "deleted_at"):
                                    setattr(existing, key, value)
                        else:
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at"):
                                    setattr(existing, key, value)
                    else:
                        filtered = {k: v for k, v in payload.items() if hasattr(Tag, k)}
                        tag = Tag(**filtered)
                        db.session.add(tag)
                else:
                    filtered = {k: v for k, v in payload.items() if hasattr(Tag, k)}
                    tag = Tag(**filtered)
                    db.session.add(tag)
            elif op_type == "update_tag":
                tag = Tag.query.with_for_update().filter(Tag.id == payload.get("id")).first()
                if tag:
                    for key, value in payload.items():
                        if hasattr(tag, key) and key not in ("id", "created_at"):
                            setattr(tag, key, value)
            elif op_type == "delete_tag":
                tag = Tag.query.with_for_update().filter(Tag.id == payload.get("id")).first()
                if tag:
                    tag.is_deleted = True
                    tag.deleted_at = datetime.now(timezone.utc)
            elif op_type == "create_property_value":
                pv_id = payload.get("id")
                if pv_id:
                    existing = EntityPropertyValue.query.with_for_update().filter(EntityPropertyValue.id == pv_id).first()
                    if existing:
                        if existing.is_deleted:
                            existing.is_deleted = False
                            existing.deleted_at = None
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at", "is_deleted", "deleted_at"):
                                    setattr(existing, key, value)
                        else:
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at"):
                                    setattr(existing, key, value)
                    else:
                        filtered = {k: v for k, v in payload.items() if hasattr(EntityPropertyValue, k)}
                        pv = EntityPropertyValue(**filtered)
                        db.session.add(pv)
                else:
                    filtered = {k: v for k, v in payload.items() if hasattr(EntityPropertyValue, k)}
                    pv = EntityPropertyValue(**filtered)
                    db.session.add(pv)
                self._update_entity_clock(
                    EntityPropertyValue.query.filter(EntityPropertyValue.id == payload.get("id")).first() if payload.get("id") else pv,
                    client_clock or int(datetime.now(timezone.utc).timestamp())
                )

            elif op_type == "update_property_value":
                pv = EntityPropertyValue.query.with_for_update().filter(EntityPropertyValue.id == payload.get("id")).first()
                if pv:
                    for key, value in payload.items():
                        if hasattr(pv, key) and key not in ("id", "created_at"):
                            setattr(pv, key, value)
                    self._update_entity_clock(pv, client_clock)
            elif op_type == "delete_property_value":
                pv = EntityPropertyValue.query.with_for_update().filter(EntityPropertyValue.id == payload.get("id")).first()
                if pv:
                    pv.is_deleted = True
                    pv.deleted_at = datetime.now(timezone.utc)
            elif op_type == "create_comment":
                Comment = _sync_comment_model()
                if Comment is None:
                    handled = False
                comment_id = payload.get("id")
                if comment_id:
                    existing = Comment.query.with_for_update().filter(Comment.id == comment_id).first()
                    if existing:
                        if existing.is_deleted:
                            existing.is_deleted = False
                            existing.deleted_at = None
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at", "is_deleted", "deleted_at"):
                                    setattr(existing, key, value)
                        else:
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at"):
                                    setattr(existing, key, value)
                    else:
                        filtered = {k: v for k, v in payload.items() if hasattr(Comment, k)}
                        comment = Comment(**filtered)
                        db.session.add(comment)
                else:
                    filtered = {k: v for k, v in payload.items() if hasattr(Comment, k)}
                    comment = Comment(**filtered)
                    db.session.add(comment)
                self._update_entity_clock(
                    Comment.query.filter(Comment.id == payload.get("id")).first() if payload.get("id") else comment,
                    client_clock or int(datetime.now(timezone.utc).timestamp())
                )

            elif op_type == "update_comment":
                Comment = _sync_comment_model()
                if Comment is None:
                    handled = False
                comment = Comment.query.with_for_update().filter(Comment.id == payload.get("id")).first()
                if comment:
                    for key, value in payload.items():
                        if hasattr(comment, key) and key not in ("id", "created_at"):
                            setattr(comment, key, value)
                    self._update_entity_clock(comment, client_clock)
            elif op_type == "delete_comment":
                Comment = _sync_comment_model()
                if Comment is None:
                    handled = False
                comment = Comment.query.with_for_update().filter(Comment.id == payload.get("id")).first()
                if comment:
                    comment.is_deleted = True
                    comment.deleted_at = datetime.now(timezone.utc)
            elif op_type == "create_file":
                file_id = payload.get("id")
                if file_id:
                    existing = File.query.with_for_update().filter(File.id == file_id).first()
                    if existing:
                        if existing.is_deleted:
                            existing.is_deleted = False
                            existing.deleted_at = None
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at", "is_deleted", "deleted_at"):
                                    setattr(existing, key, value)
                        else:
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at"):
                                    setattr(existing, key, value)
                    else:
                        filtered = {k: v for k, v in payload.items() if hasattr(File, k)}
                        file = File(**filtered)
                        db.session.add(file)
                else:
                    filtered = {k: v for k, v in payload.items() if hasattr(File, k)}
                    file = File(**filtered)
                    db.session.add(file)
                self._update_entity_clock(
                    File.query.filter(File.id == payload.get("id")).first() if payload.get("id") else file,
                    client_clock or int(datetime.now(timezone.utc).timestamp())
                )

            elif op_type == "update_file":
                file = File.query.with_for_update().filter(File.id == payload.get("id")).first()
                if file:
                    for key, value in payload.items():
                        if hasattr(file, key) and key not in ("id", "created_at"):
                            setattr(file, key, value)
                    self._update_entity_clock(file, client_clock)
            elif op_type == "delete_file":
                file = File.query.with_for_update().filter(File.id == payload.get("id")).first()
                if file:
                    file.is_deleted = True
                    file.deleted_at = datetime.now(timezone.utc)
            elif op_type == "create_entity_type":
                et_id = payload.get("id")
                if et_id:
                    existing = EntityType.query.with_for_update().filter(EntityType.id == et_id).first()
                    if existing:
                        if existing.is_deleted:
                            existing.is_deleted = False
                            existing.deleted_at = None
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at", "is_deleted", "deleted_at"):
                                    setattr(existing, key, value)
                        else:
                            for key, value in payload.items():
                                if hasattr(existing, key) and key not in ("id", "created_at"):
                                    setattr(existing, key, value)
                    else:
                        filtered = {k: v for k, v in payload.items() if hasattr(EntityType, k)}
                        et = EntityType(**filtered)
                        db.session.add(et)
                else:
                    filtered = {k: v for k, v in payload.items() if hasattr(EntityType, k)}
                    et = EntityType(**filtered)
                    db.session.add(et)
            elif op_type == "update_entity_type":
                et = EntityType.query.with_for_update().filter(EntityType.id == payload.get("id")).first()
                if et:
                    for key, value in payload.items():
                        if hasattr(et, key) and key not in ("id", "created_at"):
                            setattr(et, key, value)
            elif op_type == "delete_entity_type":
                et = EntityType.query.with_for_update().filter(EntityType.id == payload.get("id")).first()
                if et:
                    et.is_deleted = True
                    et.deleted_at = datetime.now(timezone.utc)
            else:
                handled = False
                logger.warning("Unknown operation type: %s", op_type)

            if handled:
                if not conflicts:
                    op.synced = True
                else:
                    op.synced = False
                op.synced_at = datetime.now(timezone.utc)
        except Exception:
            logger.exception("sync_operation_apply_failed", extra={"op_id": str(op.id), "op_type": op_type})
            raise

        return conflicts

    def mark_synced(self, operation_id: str) -> Any:
        """Mark a sync operation as applied."""
        repo = SyncOperationRepository()
        op = repo.get(operation_id)
        if not op:
            raise NotFoundError("Sync operation not found")
        op.synced = True
        op.synced_at = datetime.now(timezone.utc)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Sync operation already synced")
        except Exception:
            db.session.rollback()
            raise
        return op

    def sync_from_export(self, workspace_id: str, export_data: dict[str, Any]) -> dict[str, Any]:
        """Import data from a cloud export into local workspace (differential import)."""
        db.session.query(Workspace).filter(Workspace.id == workspace_id).with_for_update().first()
        counts: dict[str, int] = {"entity_types": 0, "entities": 0, "properties": 0,
                                   "relations": 0, "tags": 0, "blocks": 0, "comments": 0}

        try:
            for item in export_data.get("entity_types", []):
                name = item.get("name")
                if not name:
                    continue
                existing = EntityType.query.filter_by(workspace_id=workspace_id, name=name).first()
                if existing:
                    continue
                filtered = {k: v for k, v in item.items() if k in ENTITY_TYPE_FIELDS}
                filtered["workspace_id"] = workspace_id
                et = EntityType(**filtered)
                db.session.add(et)
                counts["entity_types"] += 1

            for item in export_data.get("tags", []):
                name = item.get("name")
                if not name:
                    continue
                existing = Tag.query.filter_by(workspace_id=workspace_id, name=name).first()
                if existing:
                    continue
                filtered = {k: v for k, v in item.items() if k in TAG_FIELDS}
                filtered["workspace_id"] = workspace_id
                t = Tag(**filtered)
                db.session.add(t)
                counts["tags"] += 1

            for item in export_data.get("properties", []):
                name = item.get("name")
                if not name:
                    continue
                existing = Property.query.filter_by(workspace_id=workspace_id, name=name).first()
                if existing:
                    continue
                filtered = {k: v for k, v in item.items() if k in PROPERTY_FIELDS}
                filtered["workspace_id"] = workspace_id
                p = Property(**filtered)
                db.session.add(p)
                counts["properties"] += 1

            for item in export_data.get("entities", []):
                name = item.get("name") or item.get("title")
                if not name:
                    continue
                existing = Entity.query.filter_by(workspace_id=workspace_id, name=name).first()
                if existing:
                    continue
                filtered = {k: v for k, v in item.items() if k in ENTITY_FIELDS}
                filtered["workspace_id"] = workspace_id
                e = Entity(**filtered)
                db.session.add(e)
                counts["entities"] += 1

            db.session.flush()

            for item in export_data.get("relations", []):
                existing = Relation.query.filter_by(
                    workspace_id=workspace_id,
                    source_id=item.get("source_id"),
                    target_id=item.get("target_id"),
                    type=item.get("type"),
                    is_deleted=False,
                ).first()
                if existing:
                    continue
                filtered = {k: v for k, v in item.items() if k in RELATION_FIELDS}
                filtered["workspace_id"] = workspace_id
                r = Relation(**filtered)
                db.session.add(r)
                counts["relations"] += 1

            for item in export_data.get("blocks", []):
                existing = Block.query.filter_by(
                    entity_id=item.get("entity_id"),
                    type=item.get("type"),
                    position=item.get("position"),
                    is_deleted=False,
                ).first()
                if existing:
                    continue
                filtered = {k: v for k, v in item.items() if k in BLOCK_FIELDS}
                b = Block(**filtered)
                db.session.add(b)
                counts["blocks"] += 1

            for item in export_data.get("comments", []):
                Comment = _sync_comment_model()
                if Comment is None:
                    break
                entity_id = item.get("entity_id")
                content = item.get("content", "")
                existing = Comment.query.filter_by(entity_id=entity_id, content=content, is_deleted=False).first()
                if existing:
                    continue
                filtered = {k: v for k, v in item.items() if k in COMMENT_FIELDS}
                filtered["workspace_id"] = workspace_id
                c = Comment(**filtered)
                db.session.add(c)
                counts["comments"] += 1

            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Resource already exists during sync import") from None
        except Exception:
            db.session.rollback()
            raise
        return {"workspace_id": str(workspace_id), "synced": counts}

    def diff_workspaces(self, local_workspace_id: str, remote_export_data: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
        """Compare local workspace against remote export data and return what's missing locally."""
        diff: dict[str, list[dict[str, Any]]] = {"entity_types": [], "entities": [], "properties": [],
                                                   "relations": [], "tags": [], "blocks": [], "comments": []}

        remote_et_names = [item["name"] for item in remote_export_data.get("entity_types", []) if item.get("name")]
        if remote_et_names:
            local_et_names = {et.name for et in EntityType.query.filter(
                EntityType.workspace_id == local_workspace_id,
                EntityType.name.in_(remote_et_names),
            ).all()}
        else:
            local_et_names = set()
        for item in remote_export_data.get("entity_types", []):
            if item.get("name") and item["name"] not in local_et_names:
                diff["entity_types"].append(item)

        remote_tag_names = [item["name"] for item in remote_export_data.get("tags", []) if item.get("name")]
        if remote_tag_names:
            local_tag_names = {t.name for t in Tag.query.filter(
                Tag.workspace_id == local_workspace_id,
                Tag.name.in_(remote_tag_names),
            ).all()}
        else:
            local_tag_names = set()
        for item in remote_export_data.get("tags", []):
            if item.get("name") and item["name"] not in local_tag_names:
                diff["tags"].append(item)

        remote_prop_names = [item["name"] for item in remote_export_data.get("properties", []) if item.get("name")]
        if remote_prop_names:
            local_prop_names = {p.name for p in Property.query.filter(
                Property.workspace_id == local_workspace_id,
                Property.name.in_(remote_prop_names),
            ).all()}
        else:
            local_prop_names = set()
        for item in remote_export_data.get("properties", []):
            if item.get("name") and item["name"] not in local_prop_names:
                diff["properties"].append(item)

        remote_entity_names = set()
        for item in remote_export_data.get("entities", []):
            name = item.get("name") or item.get("title")
            if name:
                remote_entity_names.add(name)
        if remote_entity_names:
            local_entities = {
                (e.name, e.entity_type_id)
                for e in Entity.query.filter(
                    Entity.workspace_id == local_workspace_id,
                    Entity.name.in_(remote_entity_names),
                ).all()
            }
        else:
            local_entities = set()
        for item in remote_export_data.get("entities", []):
            name = item.get("name") or item.get("title")
            etype = item.get("entity_type_id")
            if name and (name, etype) not in local_entities:
                diff["entities"].append(item)

        remote_src_ids = set()
        for item in remote_export_data.get("relations", []):
            src = item.get("source_id")
            if src:
                remote_src_ids.add(str(src))
        if remote_src_ids:
            local_relations = {
                (str(r.source_id), str(r.target_id), r.type)
                for r in Relation.query.filter(
                    Relation.workspace_id == local_workspace_id,
                    Relation.source_id.in_(remote_src_ids),
                ).all()
            }
        else:
            local_relations = set()
        for item in remote_export_data.get("relations", []):
            src = str(item.get("source_id", ""))
            tgt = str(item.get("target_id", ""))
            rtype = item.get("type", "")
            if (src, tgt, rtype) not in local_relations:
                diff["relations"].append(item)

        local_blocks = {
            (str(b.entity_id), b.position, b.type)
            for b in Block.query.filter(
                Block.entity_id.in_(
                    db.session.query(Entity.id).filter(Entity.workspace_id == local_workspace_id)
                ),
                Block.is_deleted.is_(False),
            ).all()
        }
        for item in remote_export_data.get("blocks", []):
            key = (str(item.get("entity_id", "")), item.get("position"), item.get("type"))
            if key not in local_blocks:
                diff["blocks"].append(item)

        Comment = _sync_comment_model()
        remote_comment_entities = {
            str(item.get("entity_id"))
            for item in remote_export_data.get("comments", [])
            if item.get("entity_id")
        }
        if Comment is not None and remote_comment_entities:
            local_comment_keys = {
                (str(c.entity_id), (c.content or "")[:200])
                for c in Comment.query.filter(
                    Comment.workspace_id == local_workspace_id,
                    Comment.entity_id.in_(remote_comment_entities),
                ).all()
            }
        else:
            local_comment_keys = set()
        diff["comments"] = [
            item for item in remote_export_data.get("comments", [])
            if (str(item.get("entity_id", "")), (item.get("content", ""))[:200]) not in local_comment_keys
        ]

        return diff

    def apply_diff(self, workspace_id: str, diff: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
        """Apply a diff (missing records from remote) to local workspace."""
        return self.sync_from_export(workspace_id, diff)

    # ── New sync methods ────────────────────────────────────────────

    def push(self, workspace_id: str, changes: dict[str, Any], device_id: str = 'local') -> dict[str, Any]:
        """Push local changes to the cloud (or record locally)."""
        db.session.query(Workspace).filter(Workspace.id == workspace_id).with_for_update().first()
        ws = Workspace.query.filter(Workspace.id == workspace_id).first()
        if ws and hasattr(ws, 'sync_enabled') and hasattr(ws, 'deployment_mode'):
            if not ws.sync_enabled:
                raise ValueError("Sync is disabled for this workspace")
            if ws.deployment_mode and ws.deployment_mode != _is_cloud_mode() and _is_cloud_mode():
                raise ValueError("Sync mode mismatch: workspace deployment mode differs")
        ops_created = 0
        conflicts = []

        _type_map_comment = _sync_comment_model()
        TYPE_MAP = {
            "entities": ("entity", Entity, "name"),
            "entity_types": ("entity_type", EntityType, "name"),
            "tags": ("tag", Tag, "name"),
            "blocks": ("block", Block, None),
            "relations": ("relation", Relation, None),
            "comments": ("comment", _type_map_comment, None),
            "property_values": ("property_value", EntityPropertyValue, None),
        }

        try:
            for plural_type, items in changes.items():
                singular, model, name_field = TYPE_MAP.get(plural_type, (plural_type.rstrip('s'), None, None))
                if model is None:
                    logger.warning("Unknown push type: %s", plural_type)
                    continue

                for item in items:
                    if item.get('_deleted'):
                        if item.get('id'):
                            existing = model.query.with_for_update().filter(model.id == item['id']).first()
                            if existing:
                                op_data = {
                                    "workspace_id": workspace_id,
                                    "operation_type": f"delete_{singular}",
                                    "entity_type": plural_type,
                                    "entity_id": item['id'],
                                    "payload": item,
                                    "device_id": device_id,
                                    "client_clock": int(datetime.now(timezone.utc).timestamp()),
                                }
                                SyncOperationRepository().create(op_data)
                                ops_created += 1
                            else:
                                conflicts.append({
                                    "type": plural_type, "id": item['id'],
                                    "reason": "Cannot delete: entity not found"
                                })
                        continue

                    if item.get('id'):
                        existing = model.query.with_for_update().filter(
                            model.id == item['id'],
                            model.is_deleted.is_(False),
                        ).first()
                        if existing:
                            op_data = {
                                "workspace_id": workspace_id,
                                "operation_type": f"update_{singular}",
                                "entity_type": plural_type,
                                "entity_id": item['id'],
                                "payload": item,
                                "device_id": device_id,
                                "client_clock": int(datetime.now(timezone.utc).timestamp()),
                            }
                            SyncOperationRepository().create(op_data)
                            ops_created += 1
                            continue

                    if name_field and item.get(name_field):
                        name_val = item[name_field]
                        name_filter = {name_field: name_val, 'workspace_id': workspace_id}
                        existing = model.query.with_for_update().filter_by(**name_filter, is_deleted=False).first()
                        if existing:
                            conflicts.append({
                                "type": plural_type, "id": str(existing.id),
                                "field": name_field,
                                "local": str(existing.id),
                                "remote": item.get("id"),
                            })
                            continue

                    op_data = {
                        "workspace_id": workspace_id,
                        "operation_type": f"create_{singular}",
                        "entity_type": plural_type,
                        "entity_id": item.get("id"),
                        "payload": item,
                        "device_id": device_id,
                        "client_clock": int(datetime.now(timezone.utc).timestamp()),
                    }
                    SyncOperationRepository().create(op_data)
                    ops_created += 1

            if ops_created > 0:
                try:
                    db.session.commit()
                except IntegrityError:
                    db.session.rollback()
                    raise ConflictError("Sync resource already exists")
        except Exception:
            db.session.rollback()
            raise

        result = {"pushed": ops_created, "workspace_id": str(workspace_id)}
        if conflicts:
            result["conflicts"] = conflicts
        return result

    def pull(self, workspace_id: str) -> dict[str, Any]:
        """Pull pending changes from cloud (return pending sync operations)."""
        repo = SyncOperationRepository()
        pending = repo.pending_for_workspace(workspace_id, 1, 1000)
        ops = pending.items if hasattr(pending, 'items') else (pending.get("data") or [])
        return {
            "workspace_id": str(workspace_id),
            "operations": [
                {
                    "id": str(op.id),
                    "operation_type": op.operation_type,
                    "entity_type": op.entity_type,
                    "entity_id": str(op.entity_id) if op.entity_id else None,
                    "payload": op.payload,
                    "device_id": op.device_id,
                    "client_clock": op.client_clock,
                    "created_at": op.created_at.isoformat() if op.created_at else None,
                }
                for op in ops
            ],
            "pending_count": len(ops),
        }

    def full_sync(self, workspace_id: str, remote_export: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        """Perform a bidirectional full sync.

        If remote_export is provided, diffs local against remote and applies missing items.
        """
        result = {"workspace_id": str(workspace_id), "pulled": 0, "pushed": 0}

        if remote_export:
            diff = self.diff_workspaces(workspace_id, remote_export)
            applied = self.apply_diff(workspace_id, diff)
            result["pulled"] = sum(applied.get("synced", {}).values()) or sum(
                len(v) for v in diff.values()
            )

        pending = SyncOperationRepository().pending_for_workspace(workspace_id, 1, 1000)
        ops = pending.items if hasattr(pending, 'items') else (pending.get("data") or [])
        result["pushed"] = len(ops)

        result["status"] = "complete"
        return result

    def status(self, workspace_id: str) -> dict[str, Any]:
        """Get sync status for a workspace."""
        repo = SyncOperationRepository()
        pending = repo.pending_for_workspace(workspace_id, 1, 1)
        pending_count = len(pending.items if hasattr(pending, 'items') else (pending.get("data") or []))

        all_ops = repo.list({"workspace_id": workspace_id}, 1, 1)
        total = all_ops.total if hasattr(all_ops, 'total') else (all_ops.get("meta") or {}).get("total", 0)

        entity_count = Entity.query.filter_by(workspace_id=workspace_id, is_deleted=False).count()
        block_count = Block.query.filter(
            Block.entity_id.in_(
                db.session.query(Entity.id).filter(Entity.workspace_id == workspace_id)
            ),
            Block.is_deleted.is_(False),
        ).count()

        return {
            "workspace_id": str(workspace_id),
            "mode": _is_cloud_mode() and "cloud" or "local",
            "sync_enabled": True,
            "pending_operations": pending_count,
            "total_operations": total,
            "entity_count": entity_count,
            "block_count": block_count,
            "last_sync": None,
        }

    def diff(self, workspace_id: str) -> dict[str, Any]:
        """Get diff between local and cloud by exporting local data and comparing with pending ops."""
        entities = Entity.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        entity_types = EntityType.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        properties = Property.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        relations = Relation.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        tags = Tag.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        entity_ids = [e.id for e in entities]
        blocks = (
            Block.query.filter(
                Block.entity_id.in_(entity_ids),
                Block.is_deleted.is_(False),
            ).all()
        )
        Comment = _sync_comment_model()
        comments = Comment.query.filter_by(workspace_id=workspace_id, is_deleted=False).all() if Comment else []

        local_export = {
            "entity_types": [
                {"id": str(et.id), "name": et.name, "icon": et.icon, "description": et.description}
                for et in entity_types
            ],
            "entities": [
                {"id": str(e.id), "name": e.name, "entity_type_id": str(e.entity_type_id), "icon": e.icon}
                for e in entities
            ],
            "properties": [
                {"id": str(p.id), "name": p.name, "type": p.type}
                for p in properties
            ],
            "relations": [
                {"id": str(r.id), "source_id": str(r.source_id),
                 "target_id": str(r.target_id), "type": r.type}
                for r in relations
            ],
            "tags": [
                {"id": str(t.id), "name": t.name, "color": t.color}
                for t in tags
            ],
            "blocks": [
                {"id": str(b.id), "entity_id": str(b.entity_id), "type": b.type,
                 "position": b.position}
                for b in blocks
            ],
            "comments": [
                {"id": str(c.id), "entity_id": str(c.entity_id), "content": c.content}
                for c in comments
            ],
        }

        return {
            "workspace_id": str(workspace_id),
            "local_export": local_export,
            "pending_operations": self.pull(workspace_id),
        }
