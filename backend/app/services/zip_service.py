from __future__ import annotations

import hashlib
import hmac
import io
import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import zipfile
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from flask import current_app

from app.core.logging import logger
from app.extensions import db
from app.models import (
    Block, Entity, EntityPropertyValue, EntityTag,
    EntityType, EntityFile, File, Property, Relation, Tag,
)
from app.repositories import EntityRepository

MAGIC_HEADER = b"GNOVIUM_ZIP_V1"
KEY_ID = b"0001"
KEY_ENCRYPT = b"encrypt"
KEY_HMAC = b"hmac"
FORMAT_VERSION = 1
SCHEMA_VERSION = 1
TITLE_SLUG_MAX_LENGTH = 80

SIG_HEX_LEN = 64
KEY_ID_LEN = 4
NONCE_LEN = 12
ZIP_BOMB_MAX_FILES = 10000
ZIP_BOMB_MAX_TOTAL_SIZE = 500 * 1024 * 1024  # 500 MB decompressed


def _derive_key(workspace_id: str, key_id: str = "0001", purpose: bytes = KEY_ENCRYPT) -> bytes:
    shared = (
        current_app.config.get("ZIP_ENCRYPTION_KEY")
        or os.environ.get("ZIP_ENCRYPTION_KEY")
    )
    if not shared:
        raise RuntimeError(
            "ZIP_ENCRYPTION_KEY must be set in app config or environment"
        )
    password = f"{shared}:gnovium-zip-v1".encode("utf-8")
    kid = key_id.decode("ascii") if isinstance(key_id, bytes) else key_id
    salt = f"{workspace_id}:{kid}:{purpose.decode()}".encode("utf-8")
    return hashlib.pbkdf2_hmac("sha256", password, salt, 100000, dklen=32)


def _derive_hmac_key(workspace_id: str, key_id: str = "0001") -> bytes:
    shared = (
        current_app.config.get("ZIP_HMAC_KEY")
        or os.environ.get("ZIP_HMAC_KEY")
    )
    if not shared:
        shared = (
            current_app.config.get("ZIP_ENCRYPTION_KEY")
            or os.environ.get("ZIP_ENCRYPTION_KEY")
        )
    if not shared:
        raise RuntimeError(
            "ZIP_HMAC_KEY or ZIP_ENCRYPTION_KEY must be set"
        )
    password = f"{shared}:gnovium-zip-hmac-v1".encode("utf-8")
    kid = key_id.decode("ascii") if isinstance(key_id, bytes) else key_id
    salt = f"{workspace_id}:{kid}:hmac".encode("utf-8")
    return hashlib.pbkdf2_hmac("sha256", password, salt, 100000, dklen=32)


def _title_slug(title: Optional[str]) -> str:
    name = re.sub(r"[^\w\s-]", "", title or "Untitled")
    name = re.sub(r"\s+", "-", name.strip())
    return name[:TITLE_SLUG_MAX_LENGTH] or "Untitled"


def _serialize(records):
    if not records:
        return []
    from sqlalchemy import inspect as sa_inspect
    return [
        {
            c.key: (
                str(val)
                if isinstance(val, uuid.UUID)
                or hasattr(val, "isoformat")
                else val
            )
            for c in sa_inspect(type(r)).column_attrs
            for val in (getattr(r, c.key),)
        }
        for r in records
    ]


def _serialize_record(record) -> Dict[str, Any]:
    from sqlalchemy import inspect as sa_inspect
    return {
        c.key: (
            str(val)
            if isinstance(val, uuid.UUID)
            or hasattr(val, "isoformat")
            else val
        )
        for c in sa_inspect(type(record)).column_attrs
        for val in (getattr(record, c.key),)
    }


class ZipService:

    # ── Public API ──────────────────────────────────────────────────────

    def export_workspace_to_zip(self, workspace_id: str) -> Dict[str, Any]:
        entities = EntityRepository().query().filter_by(workspace_id=workspace_id, is_deleted=False).all()
        entity_types = EntityType.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        properties_meta = Property.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        relations = Relation.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        tags = Tag.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()

        entity_ids = [e.id for e in entities]
        all_blocks: List[Block] = []
        all_property_values: List[EntityPropertyValue] = []
        entity_tag_links: List[EntityTag] = []
        from app.models import Comment as _Comment, _CloudOnlyStub
        comments: List = []
        _has_comments = not issubclass(_Comment, _CloudOnlyStub)

        if entity_ids:
            all_blocks = (
                Block.query.filter(
                    Block.entity_id.in_(entity_ids),
                    Block.is_deleted.is_(False),
                )
                .order_by(Block.entity_id, Block.position.asc())
                .all()
            )
            all_property_values = (
                EntityPropertyValue.query.filter(
                    EntityPropertyValue.entity_id.in_(entity_ids),
                    EntityPropertyValue.is_deleted.is_(False),
                ).all()
            )
            entity_tag_links = (
                EntityTag.query.filter(
                    EntityTag.entity_id.in_(entity_ids),
                    EntityTag.is_deleted.is_(False),
                ).all()
            )
            if _has_comments:
                comments = (
                    _Comment.query.filter(
                        _Comment.entity_id.in_(entity_ids),
                        _Comment.is_deleted.is_(False),
                    ).all()
                )

        entity_file_links: List[EntityFile] = []
        file_records: List[File] = []
        if entity_ids:
            entity_file_links = (
                EntityFile.query.filter(
                    EntityFile.entity_id.in_(entity_ids),
                    EntityFile.is_deleted.is_(False),
                ).all()
            )
            file_ids = {ef.file_id for ef in entity_file_links}
            if file_ids:
                file_records = File.query.filter(File.id.in_(file_ids)).all()

        file_map = {f.id: f for f in file_records}

        export_dir = os.path.join(current_app.instance_path, "exports", "zip")
        os.makedirs(export_dir, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe_ws = _title_slug(workspace_id)
        zip_name = f"gnovium_export_{safe_ws}_{timestamp}.gnv"
        zip_path = os.path.join(export_dir, zip_name)

        exported_at = datetime.now(timezone.utc).isoformat()

        meta: Dict[str, Any] = {
            "version": FORMAT_VERSION,
            "schema_version": SCHEMA_VERSION,
            "workspace_id": workspace_id,
            "key_id": "0001",
            "export_date": exported_at,
            "source": current_app.config.get("GNOVIUM_MODE", "local"),
            "entity_count": len(entities),
            "block_count": len(all_blocks),
            "relation_count": len(relations),
            "tag_count": len(tags),
            "file_count": len(file_records),
            "comment_count": len(comments),
            "hmac": "",
        }

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for ent in entities:
                ent_data = _serialize_record(ent)
                zf.writestr(
                    f"entities/{ent.id}.json",
                    json.dumps(ent_data, indent=2, ensure_ascii=False, default=str),
                )

            blocks_by_entity: Dict[str, List[Block]] = {}
            for blk in all_blocks:
                blocks_by_entity.setdefault(str(blk.entity_id), []).append(blk)
            for eid, blks in blocks_by_entity.items():
                for blk in blks:
                    blk_data = _serialize_record(blk)
                    zf.writestr(
                        f"blocks/{eid}/{blk.id}.json",
                        json.dumps(blk_data, indent=2, ensure_ascii=False, default=str),
                    )

            zf.writestr(
                "relations.json",
                json.dumps(_serialize(relations), indent=2, ensure_ascii=False, default=str),
            )

            zf.writestr(
                "tags.json",
                json.dumps(_serialize(tags), indent=2, ensure_ascii=False, default=str),
            )

            entity_tags_data = _serialize(entity_tag_links)
            zf.writestr(
                "entity_types.json",
                json.dumps(_serialize(entity_types), indent=2, ensure_ascii=False, default=str),
            )

            zf.writestr(
                "entity_tags.json",
                json.dumps(entity_tags_data, indent=2, ensure_ascii=False, default=str),
            )

            zf.writestr(
                "properties.json",
                json.dumps(_serialize(properties_meta), indent=2, ensure_ascii=False, default=str),
            )

            property_values_data = _serialize(all_property_values)
            zf.writestr(
                "entity_properties.json",
                json.dumps(property_values_data, indent=2, ensure_ascii=False, default=str),
            )

            zf.writestr(
                "comments.json",
                json.dumps(_serialize(comments), indent=2, ensure_ascii=False, default=str),
            )

            mode = current_app.config.get("GNOVIUM_MODE", "local")
            for ef_link in entity_file_links:
                file_record = file_map.get(ef_link.file_id)
                if not file_record:
                    continue

                meta_entry = {
                    "file_name": file_record.file_name,
                    "mime_type": file_record.mime_type,
                    "file_size": file_record.file_size,
                    "content_hash": file_record.content_hash,
                    "storage_provider": file_record.storage_provider,
                    "state": file_record.state,
                    "has_extracted_text": file_record.has_extracted_text,
                    "has_metadata": file_record.has_metadata,
                    "object_key": file_record.object_key,
                    "extracted_text": file_record.extracted_text,
                    "metadata_json": file_record.metadata_json,
                    "is_deleted": file_record.is_deleted,
                    "deleted_at": file_record.deleted_at.isoformat() if file_record.deleted_at else None,
                }
                zf.writestr(
                    f"files/{file_record.id}.meta.json",
                    json.dumps(meta_entry, indent=2, ensure_ascii=False, default=str),
                )

                if mode == "local" or file_record.storage_provider == "local":
                    if not file_record.object_key or ".." in file_record.object_key or file_record.object_key.startswith("/") or "\\" in file_record.object_key:
                        continue
                    objects_dir = os.path.join(current_app.instance_path, "objects")
                    file_path = os.path.join(objects_dir, file_record.object_key)
                    if os.path.isfile(file_path):
                        with open(file_path, "rb") as fh:
                            zf.writestr(f"files/{file_record.id}.bin", fh.read())
                    else:
                        zf.writestr(f"files/{file_record.id}.bin", b"")
                elif file_record.object_key:
                    try:
                        from app.services.storage_provider import create_storage_provider
                        provider = create_storage_provider(current_app.config)
                        file_bytes = provider.retrieve(file_record.object_key)
                        zf.writestr(f"files/{file_record.id}.bin", file_bytes)
                    except Exception as e:
                        logger.warning(f"Failed to fetch file {file_record.id} from storage: {e}")
                        zf.writestr(f"files/{file_record.id}.bin", b"")
                else:
                    zf.writestr(f"files/{file_record.id}.bin", b"")

            zf.writestr(
                "entity_files.json",
                json.dumps(_serialize(entity_file_links), indent=2, ensure_ascii=False, default=str),
            )

            zf.writestr(
                ".gnovium_meta",
                json.dumps(meta, indent=2, ensure_ascii=False, default=str),
            )

        zip_data = buf.getvalue()

        enc_key = _derive_key(workspace_id, KEY_ID, purpose=KEY_ENCRYPT)
        hmac_key = _derive_hmac_key(workspace_id, KEY_ID)
        nonce = os.urandom(NONCE_LEN)
        aesgcm = AESGCM(enc_key)
        ciphertext = aesgcm.encrypt(nonce, zip_data, None)
        sig = hmac.new(hmac_key, zip_data, hashlib.sha256).hexdigest()

        with open(zip_path, "wb") as f:
            f.write(MAGIC_HEADER)
            f.write(KEY_ID)
            f.write(nonce)
            f.write(ciphertext)
            f.write(sig.encode("ascii"))

        file_size = os.path.getsize(zip_path)
        logger.info(
            "zip_export_complete",
            extra={
                "path": zip_path,
                "size": file_size,
                "entity_count": len(entities),
                "workspace_id": workspace_id,
            },
        )

        return {
            "filename": zip_name,
            "file_size": file_size,
            "entity_count": len(entities),
            "workspace_id": workspace_id,
            "exported_at": meta["export_date"],
        }

    def import_workspace_from_zip(
        self, zip_path: str, workspace_id: str, expected_source: str = None
    ) -> Dict[str, Any]:
        """Import workspace from a .gnv encrypted ZIP.

        If expected_source is set ('cloud' or 'local'), validates that
        the archive was created by matching mode — this enforces
        bidirectional sync rules:
          - Cloud mode may only import zips created by local-app
          - Local mode may only import zips created by cloud
        """
        real_path = os.path.realpath(zip_path)
        allowed_dirs = [
            os.path.join(current_app.instance_path, "backups"),
            os.path.join(current_app.instance_path, "exports", "zip"),
        ]
        allowed = any(
            os.path.exists(d) and (
                real_path.startswith(os.path.realpath(d) + os.sep)
                or real_path == os.path.realpath(d)
            )
            for d in allowed_dirs
        )
        if not allowed:
            raise PermissionError("Access denied: path traversal detected")

        if not os.path.isfile(real_path):
            raise FileNotFoundError(f"ZIP file not found: {real_path}")

        with open(real_path, "rb") as f:
            raw = f.read()

        if not raw.startswith(MAGIC_HEADER):
            raise ValueError("Invalid file format: missing GNOVIUM magic header")

        header_len = len(MAGIC_HEADER)
        min_len = header_len + KEY_ID_LEN + NONCE_LEN + 1 + SIG_HEX_LEN
        if len(raw) <= min_len:
            raise ValueError("File too short: missing signature or payload")

        key_id = raw[header_len : header_len + KEY_ID_LEN].decode("ascii")
        nonce = raw[header_len + KEY_ID_LEN : header_len + KEY_ID_LEN + NONCE_LEN]
        sig_start = len(raw) - SIG_HEX_LEN
        ciphertext = raw[header_len + KEY_ID_LEN + NONCE_LEN : sig_start]
        stored_sig = raw[sig_start:].decode("ascii")

        enc_key = _derive_key(workspace_id, key_id, purpose=KEY_ENCRYPT)
        hmac_key = _derive_hmac_key(workspace_id, key_id)
        aesgcm = AESGCM(enc_key)
        zip_data = aesgcm.decrypt(nonce, ciphertext, None)

        expected_sig = hmac.new(hmac_key, zip_data, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(stored_sig, expected_sig):
            raise ValueError("HMAC signature mismatch: file has been tampered with")

        if expected_source:
            self._validate_zip_origin(zip_data, expected_source)

        return self._extract_and_import(zip_data, workspace_id)

    def _validate_zip_origin(self, zip_data: bytes, expected_source: str) -> None:
        """Validate the .gnovium_meta source field matches expected_source.

        This ensures:
          - Cloud accepts only zips created by local-app
          - Local-app accepts only zips created by cloud
        """
        buf = io.BytesIO(zip_data)
        try:
            with zipfile.ZipFile(buf, "r") as zf:
                meta_raw = zf.read(".gnovium_meta")
                meta = json.loads(meta_raw.decode("utf-8")) if meta_raw else {}
        except Exception:
            raise ValueError("Archive is missing .gnovium_meta — it may be a legacy or corrupted export that cannot be validated for origin")

        actual_source = meta.get("source", "unknown")
        if actual_source != expected_source:
            raise ValueError(
                f"Origin mismatch: archive was created by '{actual_source}' "
                f"but expected '{expected_source}'. "
                "Archives can only be imported by the counterpart mode."
            )

    # ── Internal helpers ───────────────────────────────────────────────

    def _extract_and_import(
        self, zip_data: bytes, workspace_id: str
    ) -> Dict[str, Any]:
        buf = io.BytesIO(zip_data)
        counts: Dict[str, int] = {
            "entity_types": 0,
            "tags": 0,
            "properties": 0,
            "entities": 0,
            "blocks": 0,
            "property_values": 0,
            "relations": 0,
            "comments": 0,
            "files": 0,
            "entity_files": 0,
            "entity_tags": 0,
        }

        try:
            with zipfile.ZipFile(buf, "r") as zf:
                self._validate_zip_structure(zf)
                type_id_map = self._import_entity_types(zf, workspace_id, counts)
                self._import_tags(zf, workspace_id, counts)
                property_id_map = self._import_properties(zf, workspace_id, counts)
                entity_map = self._import_entities(zf, workspace_id, counts, type_id_map, property_id_map)
                self._import_entity_properties(zf, workspace_id, entity_map, counts, property_id_map)
                self._import_entity_tags(zf, workspace_id, entity_map, counts)
                self._import_relations(zf, workspace_id, entity_map, counts)
                self._import_blocks(zf, workspace_id, entity_map, counts)
                self._import_comments(zf, workspace_id, entity_map, counts)
                self._import_files(zf, workspace_id, entity_map, counts)

            db.session.commit()
            logger.info(
                "zip_import_complete",
                extra={
                    "workspace_id": workspace_id,
                    "imported": counts,
                },
            )
            return {"workspace_id": workspace_id, "imported": counts}
        except Exception:
            db.session.rollback()
            logger.exception("zip_import_failed", extra={"workspace_id": workspace_id})
            raise

    def _validate_zip_structure(self, zf: zipfile.ZipFile) -> None:
        names = zf.namelist()

        if len(names) > ZIP_BOMB_MAX_FILES:
            raise ValueError(
                f"Archive contains {len(names)} files, "
                f"exceeds maximum of {ZIP_BOMB_MAX_FILES}"
            )

        total_decompressed = 0
        for info in zf.infolist():
            total_decompressed += info.file_size
            if total_decompressed > ZIP_BOMB_MAX_TOTAL_SIZE:
                raise ValueError(
                    f"Decompressed archive exceeds "
                    f"{ZIP_BOMB_MAX_TOTAL_SIZE} byte limit"
                )

        if not any(n.startswith("entities/") for n in names):
            raise ValueError("Missing entities/ directory in archive")
        if "relations.json" not in names:
            raise ValueError("Missing relations.json in archive")
        if "tags.json" not in names:
            raise ValueError("Missing tags.json in archive")
        if "properties.json" not in names:
            raise ValueError("Missing properties.json in archive")

        for name in names:
            if name.startswith("/") or "\\" in name or ".." in name:
                raise ValueError(f"Archive contains invalid entry name: {name!r}")

    def _import_entity_types(
        self, zf: zipfile.ZipFile, workspace_id: str, counts: Dict[str, int]
    ) -> Dict[str, str]:
        type_id_map: Dict[str, str] = {}
        if "entity_types.json" not in zf.namelist():
            return type_id_map
        existing_by_name = {
            et.name: et.id
            for et in EntityType.query.filter_by(
                workspace_id=workspace_id, is_deleted=False
            ).all()
        }
        data_list = json.loads(zf.read("entity_types.json"))
        for item in data_list:
            type_name = item.get("name", "")
            old_id = item.get("id")
            if type_name in existing_by_name:
                if old_id:
                    type_id_map[old_id] = existing_by_name[type_name]
                continue
            item.pop("id", None)
            item["workspace_id"] = workspace_id
            filtered = {k: v for k, v in item.items() if hasattr(EntityType, k)}
            new_type = EntityType(**filtered)
            db.session.add(new_type)
            db.session.flush()
            if old_id:
                type_id_map[old_id] = new_type.id
            existing_by_name[type_name] = new_type.id
            counts["entity_types"] += 1
        return type_id_map

    def _import_tags(
        self, zf: zipfile.ZipFile, workspace_id: str, counts: Dict[str, int]
    ) -> None:
        if "tags.json" not in zf.namelist():
            return
        existing = {
            t.name
            for t in Tag.query.filter_by(
                workspace_id=workspace_id, is_deleted=False
            ).all()
        }
        data_list = json.loads(zf.read("tags.json"))
        for item in data_list:
            tag_name = item.get("name", "")
            if tag_name in existing:
                continue
            existing.add(tag_name)
            item.pop("id", None)
            item["workspace_id"] = workspace_id
            filtered = {k: v for k, v in item.items() if hasattr(Tag, k)}
            db.session.add(Tag(**filtered))
            counts["tags"] += 1

    def _import_entities(
        self, zf: zipfile.ZipFile, workspace_id: str, counts: Dict[str, int],
        type_id_map: Dict[str, str] | None = None,
        property_id_map: Dict[str, str] | None = None,
    ) -> Dict[str, str]:
        existing = {
            (e.name, e.entity_type_id or "_NONE_")
            for e in Entity.query.filter_by(
                workspace_id=workspace_id, is_deleted=False
            ).all()
        }

        entity_map: Dict[str, str] = {}
        prefix = "entities/"
        for name in zf.namelist():
            if not name.startswith(prefix) or not name.endswith(".json"):
                continue
            data = json.loads(zf.read(name))
            old_type_id = data.get("entity_type_id")
            if old_type_id and type_id_map and old_type_id in type_id_map:
                data["entity_type_id"] = type_id_map[old_type_id]
            title = data.get("name") or data.get("title") or "Untitled"
            entity_type_id = data.get("entity_type_id")
            dedup_key = (title, entity_type_id or "_NONE_")
            if dedup_key in existing:
                old_id = data.get("id")
                if old_id:
                    existing_entity = Entity.query.filter_by(workspace_id=workspace_id, name=title, entity_type_id=entity_type_id, is_deleted=False).first()
                    if existing_entity:
                        entity_map[str(old_id)] = existing_entity.id
                continue
            existing.add(dedup_key)

            old_id = data.pop("id", None)
            data["workspace_id"] = workspace_id
            data.pop("created_by", None)
            data.pop("deleted_by", None)
            filtered = {k: v for k, v in data.items() if hasattr(Entity, k)}
            entity = Entity(**filtered)
            db.session.add(entity)
            db.session.flush()
            counts["entities"] += 1

            old_entity_id = str(old_id) if old_id else f"_new_{uuid.uuid4().hex}"
            entity_map[old_entity_id] = entity.id

        return entity_map

    def _import_entity_properties(
        self,
        zf: zipfile.ZipFile,
        workspace_id: str,
        entity_map: Dict[str, str],
        counts: Dict[str, int],
        property_id_map: Dict[str, str] | None = None,
    ) -> None:
        if "entity_properties.json" not in zf.namelist():
            return
        data_list = json.loads(zf.read("entity_properties.json"))
        for item in data_list:
            old_eid = item.get("entity_id", "")
            new_eid = entity_map.get(old_eid, old_eid)
            old_prop_id = item.get("property_id", "")
            new_prop_id = (property_id_map or {}).get(old_prop_id, old_prop_id)
            existing = EntityPropertyValue.query.filter(
                EntityPropertyValue.entity_id == new_eid,
                EntityPropertyValue.property_id == new_prop_id,
                EntityPropertyValue.is_deleted.is_(False),
            ).first()
            if existing:
                continue
            item.pop("id", None)
            item["entity_id"] = new_eid
            item["property_id"] = new_prop_id
            filtered = {k: v for k, v in item.items() if hasattr(EntityPropertyValue, k)}
            db.session.add(EntityPropertyValue(**filtered))
            counts["property_values"] += 1

    def _import_entity_tags(
        self,
        zf: zipfile.ZipFile,
        workspace_id: str,
        entity_map: Dict[str, str],
        counts: Dict[str, int],
    ) -> None:
        if "entity_tags.json" not in zf.namelist():
            return
        data_list = json.loads(zf.read("entity_tags.json"))
        for item in data_list:
            old_eid = item.get("entity_id", "")
            new_eid = entity_map.get(old_eid, old_eid)
            tag_id = item.get("tag_id")
            if not tag_id:
                continue
            existing = EntityTag.query.filter(
                EntityTag.entity_id == new_eid,
                EntityTag.tag_id == tag_id,
                EntityTag.is_deleted.is_(False),
            ).first()
            if existing:
                continue
            item.pop("id", None)
            item["entity_id"] = new_eid
            filtered = {k: v for k, v in item.items() if hasattr(EntityTag, k)}
            db.session.add(EntityTag(**filtered))
            counts["entity_tags"] += 1

    def _import_properties(
        self, zf: zipfile.ZipFile, workspace_id: str, counts: Dict[str, int]
    ) -> Dict[str, str]:
        existing_by_name = {
            p.name: p.id
            for p in Property.query.filter_by(
                workspace_id=workspace_id, is_deleted=False
            ).all()
        }
        old_id_to_new_id: Dict[str, str] = {}
        if "properties.json" not in zf.namelist():
            return old_id_to_new_id
        data_list = json.loads(zf.read("properties.json"))
        for item in data_list:
            name = item.get("name", "")
            old_id = item.get("id")
            if name in existing_by_name:
                if old_id:
                    old_id_to_new_id[old_id] = existing_by_name[name]
                continue
            item.pop("id", None)
            item["workspace_id"] = workspace_id
            filtered = {k: v for k, v in item.items() if hasattr(Property, k)}
            prop = Property(**filtered)
            db.session.add(prop)
            db.session.flush()
            if old_id:
                old_id_to_new_id[old_id] = prop.id
            existing_by_name[name] = prop.id
            counts["properties"] += 1
        return old_id_to_new_id

    def _import_relations(
        self,
        zf: zipfile.ZipFile,
        workspace_id: str,
        entity_map: Dict[str, str],
        counts: Dict[str, int],
    ) -> None:
        existing = {
            (r.source_id, r.target_id, r.type)
            for r in Relation.query.filter_by(
                workspace_id=workspace_id, is_deleted=False
            ).all()
        }
        if "relations.json" not in zf.namelist():
            return
        data_list = json.loads(zf.read("relations.json"))
        for item in data_list:
            src = entity_map.get(item.get("source_id", ""))
            tgt = entity_map.get(item.get("target_id", ""))
            rtype = item.get("type", "")
            if not src or not tgt or not rtype:
                continue
            if (src, tgt, rtype) in existing:
                continue
            existing.add((src, tgt, rtype))
            item.pop("id", None)
            item["workspace_id"] = workspace_id
            item["source_id"] = src
            item["target_id"] = tgt
            filtered = {k: v for k, v in item.items() if hasattr(Relation, k)}
            db.session.add(Relation(**filtered))
            counts["relations"] += 1

    def _import_blocks(
        self, zf: zipfile.ZipFile, workspace_id: str,
        entity_map: Dict[str, str], counts: Dict[str, int],
    ) -> None:
        prefix = "blocks/"
        entries = [n for n in zf.namelist() if n.startswith(prefix) and n.endswith(".json")]
        if not entries:
            return

        data_list = []
        for name in entries:
            data = json.loads(zf.read(name))
            data_list.append(data)

        block_entity_ids = []
        for item in data_list:
            old_eid = str(item.get("entity_id", ""))
            new_eid = entity_map.get(old_eid, old_eid)
            item["entity_id"] = new_eid
            block_entity_ids.append(new_eid)

        existing_block_keys = {
            (b.entity_id, b.position, b.type)
            for b in Block.query.filter(
                Block.entity_id.in_(block_entity_ids),
                Block.is_deleted.is_(False),
            ).all()
        }

        for item in data_list:
            item = {**item}
            item.pop("id", None)
            item.pop("created_by", None)
            entity_id = item.get("entity_id")
            position = item.get("position")
            block_type = item.get("type")
            if entity_id and position is not None and block_type and (entity_id, position, block_type) in existing_block_keys:
                continue
            if entity_id and position is not None and block_type:
                existing_block_keys.add((entity_id, position, block_type))
            filtered = {k: v for k, v in item.items() if hasattr(Block, k)}
            db.session.add(Block(**filtered))
            counts["blocks"] += 1

    def _import_comments(
        self,
        zf: zipfile.ZipFile,
        workspace_id: str,
        entity_map: Dict[str, str],
        counts: Dict[str, int],
    ) -> None:
        from app.models import Comment as _Comment, _CloudOnlyStub
        if issubclass(_Comment, _CloudOnlyStub):
            return
        existing = {
            (c.entity_id, c.content)
            for c in _Comment.query.filter_by(
                workspace_id=workspace_id, is_deleted=False
            ).all()
        }
        if "comments.json" not in zf.namelist():
            return
        data_list = json.loads(zf.read("comments.json"))
        for item in data_list:
            old_eid = item.get("entity_id", "")
            new_eid = entity_map.get(old_eid, old_eid)
            content = item.get("content", "")
            if (new_eid, content) in existing:
                continue
            existing.add((new_eid, content))
            item.pop("id", None)
            item.pop("user_id", None)
            item["workspace_id"] = workspace_id
            item["entity_id"] = new_eid
            filtered = {k: v for k, v in item.items() if hasattr(_Comment, k)}
            db.session.add(_Comment(**filtered))
            counts["comments"] += 1

    def _import_files(
        self,
        zf: zipfile.ZipFile,
        workspace_id: str,
        entity_map: Dict[str, str],
        counts: Dict[str, int],
    ) -> None:
        if "entity_files.json" not in zf.namelist():
            return

        entity_files_data = json.loads(zf.read("entity_files.json"))

        existing_by_hash: Dict[str, str] = {}
        for f in File.query.filter(
            File.workspace_id == workspace_id,
            File.is_deleted.is_(False),
        ).all():
            if f.content_hash:
                existing_by_hash[f.content_hash] = f.id

        objects_dir = os.path.join(current_app.instance_path, "objects")

        for ef_data in entity_files_data:
            ef_data.pop("uploaded_by", None)
            old_file_id = ef_data.get("file_id", "")
            old_entity_id = ef_data.get("entity_id", "")
            new_entity_id = entity_map.get(old_entity_id)
            block_id = ef_data.get("block_id")

            if not new_entity_id or not old_file_id:
                continue

            meta_path = f"files/{old_file_id}.meta.json"
            bin_path = f"files/{old_file_id}.bin"

            if meta_path not in zf.namelist():
                continue

            meta = json.loads(zf.read(meta_path))
            content_hash = meta.get("content_hash", "")

            if content_hash and content_hash in existing_by_hash:
                new_file_id = existing_by_hash[content_hash]
                existing_link = EntityFile.query.filter(
                    EntityFile.entity_id == new_entity_id,
                    EntityFile.file_id == new_file_id,
                    EntityFile.is_deleted.is_(False),
                ).first()
                if existing_link:
                    continue
                db.session.add(EntityFile(
                    entity_id=new_entity_id,
                    file_id=new_file_id,
                    block_id=block_id,
                ))
                counts["entity_files"] += 1
                continue

            object_key = meta.get("object_key", "")
            if not object_key or ".." in object_key or object_key.startswith("/") or "\\" in object_key:
                continue

            file_record = File(
                workspace_id=workspace_id,
                file_name=meta.get("file_name", ""),
                mime_type=meta.get("mime_type"),
                file_size=meta.get("file_size"),
                content_hash=content_hash,
                storage_provider=meta.get("storage_provider", "local"),
                object_key=object_key,
                state=meta.get("state", "READY"),
                has_extracted_text=meta.get("has_extracted_text", False),
                has_metadata=meta.get("has_metadata", False),
                extracted_text=meta.get("extracted_text"),
                metadata_json=meta.get("metadata_json"),
                is_deleted=meta.get("is_deleted", False),
                deleted_at=(
                    datetime.fromisoformat(meta["deleted_at"])
                    if meta.get("deleted_at") else None
                ),
            )
            db.session.add(file_record)
            db.session.flush()
            counts["files"] += 1

            new_file_id = file_record.id
            existing_by_hash[content_hash] = new_file_id

            if bin_path in zf.namelist():
                file_content = zf.read(bin_path)
                if file_content:
                    if content_hash:
                        actual_hash = hashlib.sha256(file_content).hexdigest()
                        if actual_hash != content_hash:
                            raise ValueError(
                                f"Content hash mismatch for file {old_file_id}: "
                                f"expected {content_hash}, got {actual_hash}"
                            )
                    os.makedirs(objects_dir, exist_ok=True)
                    if not file_record.object_key:
                        continue
                    dest_path = os.path.join(objects_dir, file_record.object_key)
                    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                    with open(dest_path, "wb") as fh:
                        fh.write(file_content)

            db.session.add(EntityFile(
                entity_id=new_entity_id,
                file_id=new_file_id,
                block_id=block_id,
            ))
            counts["entity_files"] += 1
