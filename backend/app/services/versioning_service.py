from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.errors import NotFoundError
from app.core.logging import logger
from app.extensions import db
from app.models import Block, Branch, Entity, EntityPropertyValue
from app.repositories.domain import (
    BlockVersionRepository, BranchMergeRepository, BranchRepository,
    ChangesetRepository, EntityBranchHeadRepository, EntityRepository,
    EntityVersionRepository, MergeConflictRepository, SnapshotRepository,
)
from app.services.entity_service import content_hash


def _merge_conflict_model():
    try:
        from app.models import MergeConflict as _m
        from sqlalchemy import inspect
        inspect(_m)
        return _m
    except Exception:
        return None


class VersioningService:

    def get_version(self, version_id: str) -> dict:
        version = EntityVersionRepository().get(version_id)
        if not version:
            raise NotFoundError("Version not found")
        return {
            "id": str(version.id),
            "entity_id": str(version.entity_id),
            "changeset_id": str(version.changeset_id) if version.changeset_id else None,
            "snapshot": version.snapshot,
            "content_hash": version.content_hash,
            "created_by": str(version.created_by) if hasattr(version, 'created_by') and version.created_by else None,
            "created_at": version.created_at.isoformat() if hasattr(version, 'created_at') and version.created_at else None,
        }

    def list_versions(self, entity_id: str, page: int = 1, per_page: int = 50) -> dict:
        query = EntityVersionRepository().query().filter(
            EntityVersionRepository.model.entity_id == entity_id
        ).order_by(EntityVersionRepository.model.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [
                {
                    "id": str(v.id),
                    "entity_id": str(v.entity_id),
                    "changeset_id": str(v.changeset_id) if v.changeset_id else None,
                    "content_hash": v.content_hash,
                    "created_at": v.created_at.isoformat() if v.created_at else None,
                }
                for v in pagination.items
            ],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def create_changeset(self, data: Dict[str, Any], user_id: str) -> dict:
        changeset = ChangesetRepository().create({**data, "created_by": user_id})
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("changeset_created", extra={"changeset_id": str(changeset.id), "user_id": user_id})
        return changeset

    def create_snapshot(self, data: Dict[str, Any], user_id: str) -> Any:
        branch_id = data.get("branch_id")
        entity_versions = {}
        if branch_id:
            heads = EntityBranchHeadRepository().query().filter(
                EntityBranchHeadRepository.model.branch_id == branch_id
            ).all()
            for h in heads:
                vid = self._get_head_version_id(h)
                if vid:
                    entity_versions[str(h.entity_id)] = vid
        snapshot = SnapshotRepository().create({
            **data,
            "created_by": user_id,
            "metadata": {"entity_versions": entity_versions},
        })
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        # NOTE: Snapshot only records entity version pointers — blocks, property values,
        # relations, tags, comments, and files are NOT version-frozen at snapshot time.
        # Full point-in-time restore is limited without capturing those associations.
        logger.info("snapshot_created", extra={"snapshot_id": str(snapshot.id), "user_id": user_id})
        return snapshot

    def snapshot_entity(self, entity_id: str, changeset_id: Optional[str] = None) -> Any:
        entity = EntityRepository().get(entity_id)
        if not entity:
            raise NotFoundError("Entity not found")
        payload = {
            "id": str(entity.id),
            "workspace_id": str(entity.workspace_id),
            "entity_type_id": str(entity.entity_type_id),
            "name": entity.name,
            "icon": entity.icon,
            "cover_image": entity.cover_image,
            "is_archived": entity.is_archived,
        }
        version = EntityVersionRepository().create(
            {
                "entity_id": entity.id,
                "changeset_id": changeset_id,
                "snapshot": payload,
                "content_hash": content_hash(payload),
            }
        )
        _entity_version_id = str(version.id)
        BranchService()._set_entity_branch_head_from_version(entity.id, _entity_version_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("entity_snapshot_created", extra={"entity_id": entity_id, "version_id": _entity_version_id})
        return version

    def _get_head_version_id(self, head: Any) -> Optional[str]:
        version_id = getattr(head, 'current_version_id', None)
        if version_id is not None:
            return str(version_id)
        return None

    def _head_matches(self, left: Any, right: Any) -> bool:
        lid = self._get_head_version_id(left)
        rid = self._get_head_version_id(right)
        return lid == rid

    def compare_branches(self, left_branch_id: str, right_branch_id: str) -> Dict[str, Any]:
        left_heads = EntityBranchHeadRepository().query().filter(
            EntityBranchHeadRepository.model.branch_id == left_branch_id
        ).with_for_update().all()
        right_heads = EntityBranchHeadRepository().query().filter(
            EntityBranchHeadRepository.model.branch_id == right_branch_id
        ).with_for_update().all()
        left_map = {str(h.entity_id): h for h in left_heads}
        right_map = {str(h.entity_id): h for h in right_heads}
        all_entity_ids = set(left_map.keys()) | set(right_map.keys())
        diffs: List[Dict[str, Any]] = []
        for eid in all_entity_ids:
            if eid in left_map and eid in right_map:
                if not self._head_matches(left_map[eid], right_map[eid]):
                    diffs.append({"entity_id": eid, "status": "modified"})
            elif eid in left_map:
                diffs.append({"entity_id": eid, "status": "removed"})
            else:
                diffs.append({"entity_id": eid, "status": "added"})
        return {"left_branch_id": str(left_branch_id), "right_branch_id": str(right_branch_id), "diffs": diffs, "diff_count": len(diffs)}

    def compare_versions(self, left_id: str, right_id: str) -> Dict[str, Any]:
        """Compare two entity versions and return field-level differences.

        Args:
            left_id: Left entity version ID.
            right_id: Right entity version ID.

        Returns:
            Dict with left/right version IDs and field-level diff.
        """
        repo = EntityVersionRepository()
        left = repo.get(left_id)
        right = repo.get(right_id)
        if not left:
            raise NotFoundError("Left version not found")
        if not right:
            raise NotFoundError("Right version not found")
        left_keys = set((left.snapshot or {}).keys())
        right_keys = set((right.snapshot or {}).keys())
        keys = sorted(left_keys | right_keys)
        return {
            "left_version_id": str(left.id),
            "right_version_id": str(right.id),
            "diff": {
                key: {"left": (left.snapshot or {}).get(key), "right": (right.snapshot or {}).get(key)}
                for key in keys
                if (left.snapshot or {}).get(key) != (right.snapshot or {}).get(key)
            },
        }

    def compare_block_versions(self, left_version_id: str, right_version_id: str) -> Dict[str, Any]:
        """Compare two block versions and return field-level differences.

        Args:
            left_version_id: Left block version ID.
            right_version_id: Right block version ID.

        Returns:
            Dict with left/right version IDs, block IDs, and field-level diff.
        """
        repo = BlockVersionRepository()
        left = repo.get(left_version_id)
        right = repo.get(right_version_id)
        if not left:
            raise NotFoundError("Left block version not found")
        if not right:
            raise NotFoundError("Right block version not found")
        left_snapshot = left.snapshot or {}
        right_snapshot = right.snapshot or {}
        keys = sorted(set(left_snapshot.keys()) | set(right_snapshot.keys()))
        return {
            "left_version_id": str(left.id),
            "right_version_id": str(right.id),
            "left_block_id": str(left.block_id),
            "right_block_id": str(right.block_id),
            "diff": {
                key: {"left": left_snapshot.get(key), "right": right_snapshot.get(key)}
                for key in keys
                if left_snapshot.get(key) != right_snapshot.get(key)
            },
        }

    def compare_block_snapshots(self, left_block_id: str, right_block_id: str) -> Dict[str, Any]:
        """Compare two live blocks by their current content.

        Args:
            left_block_id: Left block ID.
            right_block_id: Right block ID.

        Returns:
            Dict with block IDs and field-level diff of their content.
        """
        left_block = Block.query.filter_by(id=left_block_id).first()
        right_block = Block.query.filter_by(id=right_block_id).first()
        left_content = left_block.content if left_block else {}
        right_content = right_block.content if right_block else {}
        keys = sorted(set(left_content.keys()) | set(right_content.keys()))
        return {
            "left_block_id": str(left_block_id),
            "right_block_id": str(right_block_id),
            "diff": {
                key: {"left": left_content.get(key), "right": right_content.get(key)}
                for key in keys
                if left_content.get(key) != right_content.get(key)
            },
        }

    def restore_entity_version(self, version_id: str) -> Any:
        version = EntityVersionRepository().get(version_id)
        if not version:
            raise NotFoundError("Version not found")
        entity = EntityRepository().get(version.entity_id)
        snapshot = version.snapshot or {}
        for key in ("name", "icon", "cover_image", "is_archived"):
            setattr(entity, key, snapshot.get(key))
        _entity_id = str(entity.id)

        blocks = Block.query.with_for_update().filter(
            Block.entity_id == _entity_id, Block.is_deleted.is_(False)
        ).all()
        for block in blocks:
            block_versions = BlockVersionRepository().query().filter(
                BlockVersionRepository.model.block_id == block.id
            ).order_by(BlockVersionRepository.model.created_at.desc()).all()
            target_block_version = None
            for bv in block_versions:
                bv_snapshot = bv.snapshot or {}
                if bv_snapshot.get("entity_id") == _entity_id:
                    target_block_version = bv
                    break
            if target_block_version:
                bv_snapshot = target_block_version.snapshot or {}
                for bk in ("content", "type", "position", "indent"):
                    if bk in bv_snapshot:
                        setattr(block, bk, bv_snapshot[bk])

        property_values = EntityPropertyValue.query.with_for_update().filter(
            EntityPropertyValue.entity_id == _entity_id, EntityPropertyValue.is_deleted.is_(False)
        ).all()
        for pv in property_values:
            db.session.delete(pv)
        version_snapshot_props = (snapshot.get("properties") or {}) if isinstance(snapshot, dict) else {}
        for prop_id, prop_value in version_snapshot_props.items():
            db.session.add(EntityPropertyValue(
                entity_id=_entity_id,
                property_id=prop_id,
                value=prop_value if isinstance(prop_value, (dict, list, str, int, float, bool)) else {"value": prop_value},
            ))

        BranchService()._set_entity_branch_head_from_version(_entity_id, version_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("entity_version_restored", extra={"version_id": version_id, "entity_id": _entity_id})
        return entity


class BranchService:

    def list_branches(self, workspace_id: str = None, page: int = 1, per_page: int = 50) -> dict:
        query = BranchRepository().query()
        if workspace_id:
            query = query.filter(BranchRepository.model.workspace_id == workspace_id)
        query = query.order_by(BranchRepository.model.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [
                {
                    "id": str(b.id),
                    "workspace_id": str(b.workspace_id) if hasattr(b, 'workspace_id') and b.workspace_id else None,
                    "name": b.name if hasattr(b, 'name') else None,
                    "created_by": str(b.created_by) if hasattr(b, 'created_by') and b.created_by else None,
                    "created_at": b.created_at.isoformat() if hasattr(b, 'created_at') and b.created_at else None,
                }
                for b in pagination.items
            ],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def create(self, data: Dict[str, Any], user_id: str) -> dict:
        branch = BranchRepository().create({**data, "created_by": user_id})
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("branch_created", extra={"branch_id": str(branch.id), "user_id": user_id})
        return {
            "id": str(branch.id),
            "workspace_id": str(branch.workspace_id) if hasattr(branch, 'workspace_id') and branch.workspace_id else None,
            "name": branch.name,
            "created_by": str(branch.created_by) if hasattr(branch, 'created_by') and branch.created_by else None,
            "created_at": branch.created_at.isoformat() if hasattr(branch, 'created_at') and branch.created_at else None,
        }

    def delete(self, branch_id: str, user_id: Optional[str] = None) -> dict:
        branch = BranchRepository().get(branch_id)
        if not branch:
            raise NotFoundError("Branch not found")
        BranchRepository().soft_delete(branch, deleted_by=user_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("branch_deleted", extra={"branch_id": branch_id, "user_id": user_id})
        return {"id": str(branch.id), "deleted": True}

    def restore(self, branch_id: str) -> dict:
        branch = BranchRepository().get(branch_id, include_deleted=True)
        if not branch:
            raise NotFoundError("Branch not found")
        branch.is_deleted = False
        branch.deleted_at = None
        branch.deleted_by = None
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("branch_restored", extra={"branch_id": branch_id})
        return branch

    def _set_entity_branch_head(self, branch_id: str, entity_id: str, head_data: Dict[str, Any]) -> None:
        """Set EntityBranchHead compatible with both local and cloud schemas."""
        repo = EntityBranchHeadRepository()
        existing = repo.query().filter(
            repo.model.branch_id == branch_id,
            repo.model.entity_id == entity_id,
            repo.model.is_deleted.is_(False),
        ).with_for_update().first()
        if existing:
            for key, value in head_data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
        else:
            filtered = {k: v for k, v in head_data.items() if hasattr(repo.model, k)}
            filtered['branch_id'] = branch_id
            filtered['entity_id'] = entity_id
            repo.create(filtered)

    def _set_entity_branch_head_from_version(self, entity_id: str, version_id: str) -> None:
        """Set EntityBranchHead using a version ID."""
        head_data: Dict[str, Any] = {'current_version_id': version_id}
        if hasattr(EntityBranchHeadRepository().model, 'current_block_created_at'):
            head_data['current_block_created_at'] = datetime.now(timezone.utc)
        branch_id = self._find_branch_for_entity(entity_id)
        if branch_id:
            self._set_entity_branch_head(branch_id, entity_id, head_data)

    def _find_branch_for_entity(self, entity_id: str) -> Optional[str]:
        """Find which branch this entity's head belongs to."""
        head = EntityBranchHeadRepository().query().filter(
            EntityBranchHeadRepository.model.entity_id == entity_id
        ).with_for_update().first()
        if head:
            return str(head.branch_id)
        return None

    def update_entity_branch_head(self, entity_id: str, branch_id: str, version_id: Optional[str] = None, block_created_at: Optional[datetime] = None):
        head_data: Dict[str, Any] = {'current_version_id': version_id or ''}
        if version_id is not None:
            head_data['current_version_id'] = version_id
        if hasattr(EntityBranchHeadRepository().model, 'current_block_created_at') and block_created_at:
            head_data['current_block_created_at'] = block_created_at
        self._set_entity_branch_head(branch_id, entity_id, head_data)

    def merge(self, data: Dict[str, Any], user_id: str) -> Any:
        source_branch_id = data.get("source_branch_id")
        target_branch_id = data.get("target_branch_id")

        BranchRepository().query().filter(Branch.id == source_branch_id).with_for_update().first()
        BranchRepository().query().filter(Branch.id == target_branch_id).with_for_update().first()

        merge = BranchMergeRepository().create({
            **data, "created_by": user_id, "status": "in_progress", "merge_metadata": {}
        })

        try:
            vc = VersioningService()
            diff = vc.compare_branches(source_branch_id, target_branch_id)

            conflicts = []
            source_heads = EntityBranchHeadRepository().query().filter(
                EntityBranchHeadRepository.model.branch_id == source_branch_id
            ).with_for_update().all()

            target_heads = EntityBranchHeadRepository().query().filter(
                EntityBranchHeadRepository.model.branch_id == target_branch_id
            ).with_for_update().all()
            target_map = {str(h.entity_id): h for h in target_heads}

            for entity_diff in diff.get("diffs", []):
                eid = entity_diff["entity_id"]
                if entity_diff["status"] == "modified":
                    source_head = next((h for h in source_heads if str(h.entity_id) == eid), None)
                    target_head = target_map.get(eid)
                    if not source_head or not target_head:
                        conflicts.append({"entity_id": eid, "conflict_type": "modify_modify"})
                        continue
                    source_vid = vc._get_head_version_id(source_head)
                    target_vid = vc._get_head_version_id(target_head)
                    source_ver = EntityVersionRepository().get(source_vid) if source_vid else None
                    target_ver = EntityVersionRepository().get(target_vid) if target_vid else None
                    if not source_ver or not target_ver:
                        conflicts.append({"entity_id": eid, "conflict_type": "modify_modify"})
                        continue
                    source_snap = source_ver.snapshot or {}
                    target_snap = target_ver.snapshot or {}
                    all_keys = set(source_snap) | set(target_snap)
                    conflict_keys = set()
                    merge_keys = {}
                    for k in all_keys:
                        sv = source_snap.get(k)
                        tv = target_snap.get(k)
                        if sv == tv:
                            continue
                        if k in source_snap and k in target_snap:
                            conflict_keys.add(k)
                        elif k in source_snap:
                            merge_keys[k] = sv
                        else:
                            merge_keys[k] = tv
                    if conflict_keys:
                        conflicts.append({
                            "entity_id": eid,
                            "conflict_type": "modify_modify",
                            "details": {"conflicting_fields": list(conflict_keys)},
                        })
                    if merge_keys:
                        target_entity = Entity.query.with_for_update().filter(Entity.id == eid).first()
                        if target_entity:
                            for k, v in merge_keys.items():
                                if hasattr(target_entity, k):
                                    setattr(target_entity, k, v)
                        head_data: Dict[str, Any] = {}
                        if hasattr(EntityBranchHeadRepository().model, 'current_version_id'):
                            head_data['current_version_id'] = source_vid
                        self._set_entity_branch_head(target_branch_id, eid, head_data)

                if entity_diff["status"] == "removed":
                    source_head = next((h for h in source_heads if str(h.entity_id) == eid), None)
                    if source_head:
                        head_data: Dict[str, Any] = {}
                        repo = EntityBranchHeadRepository()
                        if hasattr(repo.model, 'current_version_id'):
                            current_version_id = getattr(source_head, 'current_version_id', None)
                            if current_version_id is not None:
                                head_data['current_version_id'] = str(current_version_id)
                            base_version_id = getattr(source_head, 'base_version_id', None)
                            if base_version_id is not None:
                                head_data['base_version_id'] = str(base_version_id)
                        if hasattr(repo.model, 'current_block_created_at'):
                            head_data['current_block_created_at'] = getattr(source_head, 'current_block_created_at', None)
                        if hasattr(repo.model, 'base_block_created_at'):
                            head_data['base_block_created_at'] = getattr(source_head, 'base_block_created_at', None)
                        self._set_entity_branch_head(target_branch_id, eid, head_data)
                        source_version_id = vc._get_head_version_id(source_head)
                        if source_version_id:
                            try:
                                source_version = EntityVersionRepository().get(source_version_id)
                            except Exception:
                                source_version = None
                            if source_version and source_version.snapshot:
                                target_entity = Entity.query.with_for_update().filter(Entity.id == eid).first()
                                if target_entity:
                                    for _attr in ("name", "icon", "cover_image", "is_archived"):
                                        if _attr in source_version.snapshot:
                                            setattr(target_entity, _attr, source_version.snapshot[_attr])

                if entity_diff["status"] == "added":
                    source_head = next((h for h in source_heads if str(h.entity_id) == eid), None)
                    if source_head:
                        head_data: Dict[str, Any] = {}
                        repo = EntityBranchHeadRepository()
                        if hasattr(repo.model, 'current_version_id'):
                            current_version_id = getattr(source_head, 'current_version_id', None)
                            if current_version_id is not None:
                                head_data['current_version_id'] = str(current_version_id)
                            base_version_id = getattr(source_head, 'base_version_id', None)
                            if base_version_id is not None:
                                head_data['base_version_id'] = str(base_version_id)
                        if hasattr(repo.model, 'current_block_created_at'):
                            head_data['current_block_created_at'] = getattr(source_head, 'current_block_created_at', None)
                        if hasattr(repo.model, 'base_block_created_at'):
                            head_data['base_block_created_at'] = getattr(source_head, 'base_block_created_at', None)
                        self._set_entity_branch_head(target_branch_id, eid, head_data)

            if conflicts:
                MergeConflict = _merge_conflict_model()
                if MergeConflict is None:
                    raise RuntimeError("MergeConflict is only available in cloud mode")
                target_branch = BranchRepository().get(target_branch_id)
                workspace_id = str(target_branch.workspace_id) if target_branch else None
                for conflict in conflicts:
                    db.session.add(MergeConflict(
                        merge_id=merge.id,
                        entity_id=conflict["entity_id"],
                        workspace_id=workspace_id,
                        conflict_type=conflict["conflict_type"],
                        details=conflict,
                    ))
                merge.status = "pending"
                merge.merge_metadata = {"conflicts": len(conflicts)}
            else:
                merge.status = "completed"
                merge.merge_metadata = {"merged_entities": diff["diff_count"]}

            db.session.commit()
            logger.info("branch_merged", extra={"merge_id": str(merge.id), "user_id": user_id, "conflicts": len(conflicts)})
        except Exception:
            db.session.rollback()
            merge.status = "failed"
            merge.merge_metadata = {"error": "Merge failed"}
            db.session.add(merge)
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
            logger.exception("branch_merge_failed", extra={"merge_id": str(merge.id)})

        return merge

    def resolve_conflict(self, conflict_id: str, resolution: str, merged_content=None, user_id: Optional[str] = None) -> Any:
        conflict = MergeConflictRepository().get(conflict_id)
        if not conflict:
            raise NotFoundError("Conflict not found")
        conflict.resolved = True
        conflict.resolution = resolution
        conflict.resolved_by = user_id
        conflict.resolved_at = datetime.now(timezone.utc)
        if resolution == "manual" and merged_content:
            conflict.details = {**(conflict.details or {}), "merged_content": merged_content}

        if resolution in ("source", "target") and conflict.entity_id:
            merge = BranchMergeRepository().get(conflict.merge_id)
            if merge:
                branch_id = str(merge.source_branch_id if resolution == "source" else merge.target_branch_id)
                head = EntityBranchHeadRepository().query().filter(
                    EntityBranchHeadRepository.model.branch_id == branch_id,
                    EntityBranchHeadRepository.model.entity_id == conflict.entity_id,
                ).with_for_update().first()
                if head:
                    target_branch_id = str(merge.target_branch_id if resolution == "source" else merge.source_branch_id)
                    head_data: Dict[str, Any] = {}
                    repo = EntityBranchHeadRepository()
                    if hasattr(repo.model, 'current_version_id'):
                        current_version_id = getattr(head, 'current_version_id', None)
                        if current_version_id is not None:
                            head_data['current_version_id'] = str(current_version_id)
                        base_version_id = getattr(head, 'base_version_id', None)
                        if base_version_id is not None:
                            head_data['base_version_id'] = str(base_version_id)
                    if hasattr(repo.model, 'current_block_created_at'):
                        head_data['current_block_created_at'] = getattr(head, 'current_block_created_at', None)
                    self._set_entity_branch_head(target_branch_id, str(conflict.entity_id), head_data)

        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return conflict
