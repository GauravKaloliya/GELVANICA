from typing import Any, Dict

from app.extensions import db
from app.models import Block, Entity, EntityType, Property, Relation, Tag


def _importer_comment_model():
    try:
        from app.models import Comment as _m
        from sqlalchemy import inspect
        inspect(_m)
        return _m
    except Exception:
        return None


ENTITY_TYPE_FIELDS = frozenset({"name", "description", "icon", "color", "metadata"})
TAG_FIELDS = frozenset({"name", "color", "description"})
PROPERTY_FIELDS = frozenset({"name", "type", "description", "required", "options", "metadata"})
ENTITY_FIELDS = frozenset({"name", "entity_type_id", "icon", "cover_image", "is_archived", "metadata"})
RELATION_FIELDS = frozenset({"source_id", "target_id", "type", "properties", "position"})
BLOCK_FIELDS = frozenset({"entity_id", "type", "content", "parent_block_id", "position", "branch_id", "metadata"})
COMMENT_FIELDS = frozenset({"entity_id", "content", "block_id", "parent_id"})


class ValidationError(Exception):
    pass


class ImportConflict(Exception):
    def __init__(self, message: str, conflicts: list):
        self.conflicts = conflicts
        super().__init__(message)


class WorkspaceImporter:

    def import_data(
        self,
        workspace_id: str,
        data: Dict[str, Any],
        field_whitelist: Dict[str, frozenset] | None = None,
        conflict_strategy: str = "skip",
    ) -> Dict[str, Any]:
        """Import workspace data with configurable conflict resolution.

        Args:
            workspace_id: Target workspace.
            data: Dict with keys ``entity_types``, ``tags``, ``properties``,
                ``entities``, ``relations``, ``blocks``, ``comments``.
            field_whitelist: Per-type field whitelists, or ``None`` to allow all.
            conflict_strategy: ``"skip"`` (default), ``"overwrite"``, or ``"report"``.

        Returns:
            Dict with ``imported`` counts and ``conflicts`` list.
        """
        self._validate_input_data(data)
        counts: Dict[str, int] = {
            "entity_types": 0, "entities": 0, "properties": 0,
            "relations": 0, "tags": 0, "blocks": 0, "comments": 0,
        }
        conflicts: list = []
        fw = field_whitelist or {}

        existing_type_names = {
            et.name for et in EntityType.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        }
        try:
            for item in data.get("entity_types", []):
                item = {**item}
                item.pop("id", None)
                item["workspace_id"] = workspace_id
                name = item.get("name")
                if name and name in existing_type_names:
                    if conflict_strategy == "report":
                        conflicts.append({"type": "entity_type", "name": name, "action": "skipped"})
                    elif conflict_strategy == "overwrite":
                        et = EntityType.query.filter_by(workspace_id=workspace_id, name=name, is_deleted=False).first()
                        if et:
                            for k, v in item.items():
                                if hasattr(et, k) and k not in ("id", "workspace_id", "created_at"):
                                    setattr(et, k, v)
                            counts["entity_types"] += 1
                    continue
                if name:
                    existing_type_names.add(name)
                filtered = {k: v for k, v in item.items() if k in fw.get("entity_types", item)} if "entity_types" in fw else item
                et = EntityType(**{k: v for k, v in filtered.items() if hasattr(EntityType, k)})
                db.session.add(et)
                counts["entity_types"] += 1

            existing_tag_names = {
                t.name for t in Tag.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
            }
            for item in data.get("tags", []):
                item = {**item}
                item.pop("id", None)
                item["workspace_id"] = workspace_id
                name = item.get("name")
                if name and name in existing_tag_names:
                    if conflict_strategy == "report":
                        conflicts.append({"type": "tag", "name": name, "action": "skipped"})
                    elif conflict_strategy == "overwrite":
                        t = Tag.query.filter_by(workspace_id=workspace_id, name=name, is_deleted=False).first()
                        if t:
                            for k, v in item.items():
                                if hasattr(t, k) and k not in ("id", "workspace_id", "created_at"):
                                    setattr(t, k, v)
                            counts["tags"] += 1
                    continue
                if name:
                    existing_tag_names.add(name)
                filtered = {k: v for k, v in item.items() if k in fw.get("tags", item)} if "tags" in fw else item
                t = Tag(**{k: v for k, v in filtered.items() if hasattr(Tag, k)})
                db.session.add(t)
                counts["tags"] += 1

            existing_prop_names = {
                p.name for p in Property.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
            }
            for item in data.get("properties", []):
                item = {**item}
                item.pop("id", None)
                item["workspace_id"] = workspace_id
                name = item.get("name")
                if name and name in existing_prop_names:
                    if conflict_strategy == "report":
                        conflicts.append({"type": "property", "name": name, "action": "skipped"})
                    elif conflict_strategy == "overwrite":
                        p = Property.query.filter_by(workspace_id=workspace_id, name=name, is_deleted=False).first()
                        if p:
                            for k, v in item.items():
                                if hasattr(p, k) and k not in ("id", "workspace_id", "created_at"):
                                    setattr(p, k, v)
                            counts["properties"] += 1
                    continue
                if name:
                    existing_prop_names.add(name)
                filtered = {k: v for k, v in item.items() if k in fw.get("properties", item)} if "properties" in fw else item
                p = Property(**{k: v for k, v in filtered.items() if hasattr(Property, k)})
                db.session.add(p)
                counts["properties"] += 1

            existing_entity_keys = {
                (e.name, e.entity_type_id) for e in Entity.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
            }
            for item in data.get("entities", []):
                item = {**item}
                item.pop("id", None)
                item["workspace_id"] = workspace_id
                name = item.get("name") or item.get("title")
                etype = item.get("entity_type_id")
                if name and etype and (name, etype) in existing_entity_keys:
                    if conflict_strategy == "report":
                        conflicts.append({"type": "entity", "title": name, "action": "skipped"})
                    elif conflict_strategy == "overwrite":
                        e = Entity.query.filter_by(workspace_id=workspace_id, name=name, entity_type_id=etype, is_deleted=False).first()
                        if e:
                            for k, v in item.items():
                                if hasattr(e, k) and k not in ("id", "workspace_id", "created_at", "entity_type_id"):
                                    setattr(e, k, v)
                            counts["entities"] += 1
                    continue
                if name and etype:
                    existing_entity_keys.add((name, etype))
                filtered = {k: v for k, v in item.items() if k in fw.get("entities", item)} if "entities" in fw else item
                e = Entity(**{k: v for k, v in filtered.items() if hasattr(Entity, k)})
                db.session.add(e)
                counts["entities"] += 1

            db.session.flush()

            existing_relation_keys = {
                (r.source_id, r.target_id, r.type)
                for r in Relation.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
            }
            for item in data.get("relations", []):
                item = {**item}
                item.pop("id", None)
                item["workspace_id"] = workspace_id
                src = item.get("source_id")
                tgt = item.get("target_id")
                rtype = item.get("type")
                if src and tgt and rtype and (src, tgt, rtype) in existing_relation_keys:
                    if conflict_strategy == "report":
                        conflicts.append({"type": "relation", "source": src, "target": tgt, "action": "skipped"})
                    continue
                if src and tgt and rtype:
                    existing_relation_keys.add((src, tgt, rtype))
                filtered = {k: v for k, v in item.items() if k in fw.get("relations", item)} if "relations" in fw else item
                r = Relation(**{k: v for k, v in filtered.items() if hasattr(Relation, k)})
                db.session.add(r)
                counts["relations"] += 1

            existing_block_keys = {
                (b.entity_id, b.type, b.position)
                for b in Block.query.filter(
                    Block.entity_id.in_(
                        db.session.query(Entity.id).filter(Entity.workspace_id == workspace_id)
                    ),
                    Block.is_deleted.is_(False),
                ).all()
            }
            for item in data.get("blocks", []):
                item = {**item}
                item.pop("id", None)
                entity_id = item.get("entity_id")
                block_type = item.get("type")
                position = item.get("position")
                if entity_id and block_type and position is not None and (entity_id, block_type, position) in existing_block_keys:
                    if conflict_strategy == "report":
                        conflicts.append({"type": "block", "entity_id": entity_id, "position": position, "action": "skipped"})
                    continue
                if entity_id and block_type and position is not None:
                    existing_block_keys.add((entity_id, block_type, position))
                filtered = {k: v for k, v in item.items() if k in fw.get("blocks", item)} if "blocks" in fw else item
                b = Block(**{k: v for k, v in filtered.items() if hasattr(Block, k)})
                db.session.add(b)
                counts["blocks"] += 1

            Comment = _importer_comment_model()
            if Comment is not None:
                existing_comment_keys = {
                    (c.entity_id, c.content) for c in Comment.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
                }
                for item in data.get("comments", []):
                    item = {**item}
                    item.pop("id", None)
                    item["workspace_id"] = workspace_id
                    content = item.get("content")
                    entity_id = item.get("entity_id")
                    if content and entity_id and (entity_id, content) in existing_comment_keys:
                        if conflict_strategy == "report":
                            conflicts.append({"type": "comment", "entity_id": entity_id, "action": "skipped"})
                        continue
                    if content and entity_id:
                        existing_comment_keys.add((entity_id, content))
                    filtered = {k: v for k, v in item.items() if k in fw.get("comments", item)} if "comments" in fw else item
                    c = Comment(**{k: v for k, v in filtered.items() if hasattr(Comment, k)})
                    db.session.add(c)
                    counts["comments"] += 1

            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        result = {"imported": counts}
        if conflicts:
            result["conflicts"] = conflicts
        return result

    def _validate_input_data(self, data: Dict[str, Any]) -> None:
        """Validate the structure of import data."""
        for key in ("entity_types", "tags", "properties", "entities", "relations", "blocks", "comments"):
            items = data.get(key, [])
            if not isinstance(items, list):
                raise ValidationError(f"Field '{key}' must be a list, got {type(items).__name__}")
            for item in items:
                if not isinstance(item, dict):
                    raise ValidationError(f"Each item in '{key}' must be a dict, got {type(item).__name__}")
