from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from sqlalchemy import func

from app.core.errors import NotFoundError
from app.extensions import db
from app.models import ActivityLog as ActivityLogModel
from app.models import Block, EntityFile, File as FileModel
from app.repositories.base import BaseRepository
from app.repositories.mixins import ActivityLogListMixin, NextPositionMixin

logger = logging.getLogger(__name__)


class BlockRepository(NextPositionMixin, BaseRepository):
    model = Block

    def get(self, block_id: str, branch_id: Optional[str] = None, include_deleted: bool = False) -> Block:
        query = self.query(include_deleted=include_deleted).filter(Block.id == str(block_id))
        if branch_id:
            query = query.filter(Block.branch_id == str(branch_id))
        block = query.first()
        if block is None:
            raise NotFoundError(f"Block {block_id} not found")
        return block

    def list_current(self, entity_id: str, branch_id: str = "00000000-0000-0000-0000-000000000003") -> List[Block]:
        latest = (
            self.session.query(
                Block.id,
                func.max(Block.created_at).label("max_created_at"),
            )
            .filter(
                Block.entity_id == entity_id,
                Block.branch_id == branch_id,
            )
            .group_by(Block.id)
            .subquery()
        )
        return (
            self.session.query(Block)
            .join(
                latest,
                db.and_(
                    Block.id == latest.c.id,
                    Block.created_at == latest.c.max_created_at,
                ),
            )
            .filter(Block.is_deleted.is_(False))
            .order_by(Block.position)
            .all()
        )

    def create(self, data: dict) -> Block:
        data.setdefault("branch_id", "00000000-0000-0000-0000-000000000003")
        return super().create(data)

    def update(self, item: Block, data: dict) -> Block:
        """Updates a block in-place. Creates new version for history but keeps same record active."""
        readonly = {"id", "created_at", "is_deleted", "deleted_at", "deleted_by", "version", "updated_at"}
        for key, value in data.items():
            if key not in readonly and hasattr(item, key):
                setattr(item, key, value)
        item.updated_at = datetime.now(timezone.utc)
        self.session.flush()
        return item

    def soft_delete(self, item: Block, deleted_by: Optional[str] = None) -> Block:
        item.is_deleted = True
        item.deleted_at = datetime.now(timezone.utc)
        if deleted_by is not None and hasattr(item, "deleted_by"):
            item.deleted_by = str(deleted_by)
        self.session.flush()
        return item


class FileRepository(BaseRepository):
    model = FileModel

    def find_by_hash(self, content_hash: str, workspace_id: Optional[str] = None) -> Optional[FileModel]:
        query = self.query().filter(self.model.content_hash == content_hash)
        if workspace_id:
            query = query.filter(self.model.workspace_id == workspace_id)
        return query.first()

    def hard_delete(self, item: FileModel) -> None:
        self._remove_from_disk(item)
        self.session.delete(item)

    def soft_delete(self, item: FileModel, deleted_by: Optional[str] = None) -> FileModel:
        self._remove_from_disk(item)
        item.is_deleted = True
        item.deleted_at = datetime.now(timezone.utc)
        if deleted_by is not None:
            item.deleted_by = str(deleted_by)
        self.session.flush()
        return item

    @staticmethod
    def _remove_from_disk(file_record: FileModel) -> None:
        if file_record.storage_provider != "local" or not file_record.object_key:
            return
        storage_root = _get_storage_root()
        if not storage_root:
            return
        full_path = os.path.join(storage_root, file_record.object_key)
        real_storage = os.path.realpath(storage_root)
        real_path = os.path.realpath(full_path)
        if not real_path.startswith(real_storage + os.sep) and real_path != real_storage:
            return
        if os.path.isfile(full_path):
            os.remove(full_path)
            _cleanup_empty_dirs(os.path.dirname(full_path), storage_root)
        _remove_variants_from_disk(storage_root, file_record)

    def find_pending_expired(self, hours: int = 24, limit: int = 1000):
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        return self.query().filter(
            self.model.state == "PENDING",
            self.model.uploaded_at <= cutoff,
        ).limit(limit).all()

    def cleanup_orphans(self, workspace_id: Optional[str] = None) -> int:
        query = self.session.query(self.model).filter(
            self.model.is_deleted.is_(False),
        )
        if workspace_id:
            query = query.filter(self.model.workspace_id == workspace_id)

        orphan_files = (
            query.filter(
                ~self.session.query(EntityFile)
                .filter(
                    EntityFile.file_id == self.model.id,
                    EntityFile.is_deleted.is_(False),
                )
                .exists()
            )
            .all()
        )

        count = 0
        now = datetime.now(timezone.utc)
        for file_record in orphan_files:
            self._remove_from_disk(file_record)
            file_record.is_deleted = True
            file_record.deleted_at = now
            count += 1
        self.session.flush()
        return count


def _get_storage_root() -> Optional[str]:
    from flask import current_app
    storage_provider = getattr(current_app, "storage_provider", None)
    if storage_provider and hasattr(storage_provider, "storage_root"):
        return storage_provider.storage_root
    return os.path.join(current_app.instance_path, "objects")


def _cleanup_empty_dirs(dir_path: str, stop_at: str) -> None:
    while dir_path != stop_at and os.path.isdir(dir_path) and not os.listdir(dir_path):
        os.rmdir(dir_path)
        dir_path = os.path.dirname(dir_path)


def _remove_variants_from_disk(storage_root: str, file_record: Any) -> None:
    prefix = file_record.content_hash[:2] if file_record.content_hash else None
    if not prefix:
        return
    content_hash = file_record.content_hash
    real_storage = os.path.realpath(storage_root)
    for tier in ("thumbnail", "preview", "optimized"):
        for ext in (".webp", ""):
            variant_path = os.path.join(storage_root, tier, prefix, f"{content_hash}{ext}")
            try:
                real_variant = os.path.realpath(variant_path)
                if not str(real_variant).startswith(str(real_storage) + os.sep) and real_variant != real_storage:
                    logger.warning(f"Path traversal attempt blocked: {variant_path}")
                    continue
                if os.path.isfile(variant_path):
                    os.remove(variant_path)
                    _cleanup_empty_dirs(os.path.dirname(variant_path), os.path.join(storage_root, tier))
            except Exception as e:
                logger.warning(f"Failed to remove variant {variant_path}: {e}")


class ActivityLogRepository(ActivityLogListMixin, BaseRepository):
    model = ActivityLogModel
