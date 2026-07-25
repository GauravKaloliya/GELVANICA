import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from flask import current_app

from app.core.errors import NotFoundError
from app.extensions import db
from app.models import Block, Entity, EntityFile, EntityType, File, Property, Relation, Tag
from app.services.export_service import ExportService
from app.services.zip_service import ZipService

from app.core.logging import logger


def _backup_comment_model():
    try:
        from app.models import Comment as _m
        from sqlalchemy import inspect
        inspect(_m)
        return _m
    except Exception:
        return None


class BackupService:

    def __init__(self, zip_service=None):
        self.zip_service = zip_service or ZipService()

    def create_backup(self, workspace_id: str) -> dict:
        """Create a secure encrypted ZIP backup of the workspace."""
        zip_result = self.zip_service.export_workspace_to_zip(workspace_id)
        backup_dir = os.path.join(current_app.instance_path, "backups")
        os.makedirs(backup_dir, exist_ok=True)
        src_path = os.path.join(current_app.instance_path, "exports", "zip", zip_result["filename"])
        if not os.path.isfile(src_path):
            raise RuntimeError("ZIP export failed: output file not found")
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        dest_name = f"backup_{workspace_id}_{timestamp}.gnv"
        dest_path = os.path.join(backup_dir, dest_name)
        try:
            shutil.copy2(src_path, dest_path)
        except OSError as exc:
            raise RuntimeError(f"Failed to copy backup file: {exc}") from exc
        return {
            "workspace_id": str(workspace_id),
            "path": dest_path,
            "filename": dest_name,
            "size_bytes": os.path.getsize(dest_path),
            "exported_at": zip_result.get("exported_at", datetime.now(timezone.utc).isoformat()),
            "entity_count": zip_result.get("entity_count", 0),
        }

    def list_backups(self, workspace_id: Optional[str] = None) -> list:
        """List available backup files on disk (.gnv and .json). Delegates to ExportService."""
        return ExportService().list_backups(workspace_id)

    def restore_backup(self, workspace_id: str, backup_path: str, expected_source: Optional[str] = None) -> dict:
        """Restore workspace from a backup file (JSON or encrypted .gnv)."""
        real_path = os.path.realpath(backup_path)
        backup_dir = os.path.join(current_app.instance_path, "backups")
        export_zip_dir = os.path.join(current_app.instance_path, "exports", "zip")
        export_json_dir = os.path.join(current_app.instance_path, "exports", "json")
        allowed = False
        for base in (backup_dir, export_zip_dir, export_json_dir):
            base_real = os.path.realpath(base)
            if real_path.startswith(base_real + os.sep) or real_path == base_real:
                allowed = True
                break
        if not allowed:
            raise PermissionError("Access denied: path traversal detected")
        if not os.path.exists(real_path):
            raise NotFoundError("Backup file not found")

        if real_path.endswith(".gnv"):
            return self.zip_service.import_workspace_from_zip(real_path, workspace_id, expected_source=expected_source)
        elif real_path.endswith(".json"):
            with open(real_path, "r") as f:
                data = json.load(f)
            return self.import_workspace(workspace_id, data)
        else:
            raise ValueError(f"Unsupported backup format: {real_path}")

    @staticmethod
    def serialize(records):
        """Serialize SQLAlchemy records to dicts. Delegates to ExportService."""
        return ExportService.serialize(records)

    def import_workspace(self, workspace_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        counts: Dict[str, int] = {"entity_types": 0, "entities": 0, "properties": 0, "relations": 0, "tags": 0, "blocks": 0, "comments": 0, "files": 0, "entity_files": 0}
        try:
            existing_type_by_name: Dict[str, str] = {
                et.name: et.id
                for et in EntityType.query.filter_by(workspace_id=workspace_id, is_deleted=False).with_for_update().all()
            }
            et_id_map: Dict[str, str] = {}
            for item in data.get("entity_types", []):
                item = {**item}
                old_id = item.pop("id", None)
                item["workspace_id"] = workspace_id
                name = item.get("name")
                if name and name in existing_type_by_name:
                    if old_id:
                        et_id_map[old_id] = existing_type_by_name[name]
                    continue
                if name:
                    existing_type_by_name[name] = None
                et = EntityType(**{k: v for k, v in item.items() if hasattr(EntityType, k)})
                db.session.add(et)
                db.session.flush()
                if old_id:
                    et_id_map[old_id] = et.id
                if name:
                    existing_type_by_name[name] = et.id
                counts["entity_types"] += 1

            existing_tag_names = {t.name for t in Tag.query.filter_by(workspace_id=workspace_id, is_deleted=False).with_for_update().all()}
            for item in data.get("tags", []):
                item = {**item}
                item.pop("id", None)
                item["workspace_id"] = workspace_id
                name = item.get("name")
                if name and name in existing_tag_names:
                    continue
                if name:
                    existing_tag_names.add(name)
                t = Tag(**{k: v for k, v in item.items() if hasattr(Tag, k)})
                db.session.add(t)
                counts["tags"] += 1

            existing_prop_names = {p.name for p in Property.query.filter_by(workspace_id=workspace_id, is_deleted=False).with_for_update().all()}
            prop_id_map: Dict[str, str] = {}
            for item in data.get("properties", []):
                item = {**item}
                old_id = item.pop("id", None)
                item["workspace_id"] = workspace_id
                name = item.get("name")
                if name and name in existing_prop_names:
                    continue
                if name:
                    existing_prop_names.add(name)
                p = Property(**{k: v for k, v in item.items() if hasattr(Property, k)})
                db.session.add(p)
                db.session.flush()
                if old_id:
                    prop_id_map[old_id] = p.id
                counts["properties"] += 1

            entity_map: Dict[str, str] = {}
            existing_entity_names = {(e.name, str(e.entity_type_id)) for e in Entity.query.filter_by(workspace_id=workspace_id, is_deleted=False).with_for_update().all()}
            for item in data.get("entities", []):
                item = {**item}
                old_id = item.pop("id", None)
                item["workspace_id"] = workspace_id
                old_type_id = item.get("entity_type_id")
                if old_type_id and old_type_id in et_id_map:
                    item["entity_type_id"] = et_id_map[old_type_id]
                title = item.get("name") or item.get("title")
                entity_type_id = str(item.get("entity_type_id", ""))
                if (title, entity_type_id) in existing_entity_names:
                    if old_id:
                        existing = Entity.query.filter_by(workspace_id=workspace_id, name=title, entity_type_id=entity_type_id, is_deleted=False).first()
                        if existing:
                            entity_map[str(old_id)] = existing.id
                    continue
                if title:
                    existing_entity_names.add((title, entity_type_id))
                e = Entity(**{k: v for k, v in item.items() if hasattr(Entity, k)})
                db.session.add(e)
                db.session.flush()
                if old_id:
                    entity_map[str(old_id)] = e.id
                counts["entities"] += 1

            existing_relation_keys = {
                (r.source_id, r.target_id, r.type)
                for r in Relation.query.filter_by(workspace_id=workspace_id, is_deleted=False).with_for_update().all()
            }
            for item in data.get("relations", []):
                item = {**item}
                item.pop("id", None)
                item["workspace_id"] = workspace_id
                src = entity_map.get(item.get("source_id", ""), item.get("source_id", ""))
                tgt = entity_map.get(item.get("target_id", ""), item.get("target_id", ""))
                rtype = item.get("type", "")
                if not src or not tgt or not rtype:
                    continue
                if (src, tgt, rtype) in existing_relation_keys:
                    continue
                existing_relation_keys.add((src, tgt, rtype))
                item["source_id"] = src
                item["target_id"] = tgt
                r = Relation(**{k: v for k, v in item.items() if hasattr(Relation, k)})
                db.session.add(r)
                counts["relations"] += 1

            block_entity_ids: List[str] = []
            for item in data.get("blocks", []):
                old_eid = str(item.get("entity_id", ""))
                new_eid = entity_map.get(old_eid, old_eid)
                item["entity_id"] = new_eid
                block_entity_ids.append(new_eid)

            existing_block_keys = {
                (b.entity_id, b.position, b.type)
                for b in Block.query.filter(
                    Block.entity_id.in_(block_entity_ids),
                    Block.is_deleted.is_(False),
                ).with_for_update().all()
            }
            for item in data.get("blocks", []):
                item = {**item}
                item.pop("id", None)
                entity_id = item.get("entity_id")
                position = item.get("position")
                block_type = item.get("type")
                if entity_id and position is not None and block_type and (entity_id, position, block_type) in existing_block_keys:
                    continue
                if entity_id and position is not None and block_type:
                    existing_block_keys.add((entity_id, position, block_type))
                b = Block(**{k: v for k, v in item.items() if hasattr(Block, k)})
                db.session.add(b)
                counts["blocks"] += 1

            Comment = _backup_comment_model()
            if Comment is not None:
                existing_comment_keys = {
                    (c.entity_id, c.content)
                    for c in Comment.query.filter_by(workspace_id=workspace_id, is_deleted=False).with_for_update().all()
                }
                for item in data.get("comments", []):
                    item = {**item}
                    item.pop("id", None)
                    item["workspace_id"] = workspace_id
                    old_eid = item.get("entity_id", "")
                    entity_id = entity_map.get(old_eid, old_eid)
                    content = item.get("content")
                    if content and entity_id and (entity_id, content) in existing_comment_keys:
                        continue
                    if content and entity_id:
                        existing_comment_keys.add((entity_id, content))
                    item["entity_id"] = entity_id
                    c = Comment(**{k: v for k, v in item.items() if hasattr(Comment, k)})
                    db.session.add(c)
                    counts["comments"] += 1

            existing_file_hashes = {f.content_hash: f.id for f in File.query.filter(
                File.workspace_id == workspace_id, File.is_deleted.is_(False)
            ).with_for_update().all()}
            for item in data.get("files", []):
                content_hash = item.get("content_hash", "")
                if content_hash and content_hash in existing_file_hashes:
                    continue
                item = {**item}
                item.pop("id", None)
                item["workspace_id"] = workspace_id
                filtered = {k: v for k, v in item.items() if hasattr(File, k)}
                f = File(**filtered)
                db.session.add(f)
                db.session.flush()
                existing_file_hashes[content_hash] = f.id
                counts["files"] = counts.get("files", 0) + 1

            existing_ef_links = {
                (ef.entity_id, ef.file_id)
                for ef in EntityFile.query.filter(
                    EntityFile.is_deleted.is_(False),
                    EntityFile.entity_id.in_(
                        db.session.query(Entity.id).filter(Entity.workspace_id == workspace_id)
                    ),
                ).with_for_update().all()
            }
            for item in data.get("entity_files", []):
                item = {**item}
                item.pop("id", None)
                old_eid = str(item.get("entity_id", ""))
                new_eid = entity_map.get(old_eid, old_eid)
                item["entity_id"] = new_eid
                file_id = item.get("file_id")
                if (new_eid, file_id) in existing_ef_links:
                    continue
                existing_ef_links.add((new_eid, file_id))
                filtered = {k: v for k, v in item.items() if hasattr(EntityFile, k)}
                ef = EntityFile(**filtered)
                db.session.add(ef)
                counts["entity_files"] = counts.get("entity_files", 0) + 1

            db.session.commit()
            logger.info("workspace_imported", extra={"workspace_id": str(workspace_id), "counts": counts})
            return {"workspace_id": str(workspace_id), "imported": counts}
        except Exception:
            db.session.rollback()
            logger.exception("workspace_import_failed", extra={"workspace_id": str(workspace_id)})
            raise
