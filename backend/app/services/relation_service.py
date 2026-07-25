from typing import Any, Dict, List, Optional

from app.events.service import EventService
from app.extensions import db
from app.core.errors import ApiError, ConflictError, NotFoundError
from app.core.logging import logger
from app.models import Relation
from app.repositories import EntityRepository, RelationRepository


class RelationService:

    @staticmethod
    def _to_dict(r) -> dict:
        return {
            "id": str(r.id),
            "workspace_id": str(r.workspace_id) if r.workspace_id else None,
            "source_id": str(r.source_id),
            "target_id": str(r.target_id),
            "type": r.type,
            "label": r.label,
            "properties": r.properties,
            "generated_by": r.generated_by,
            "verified": r.verified,
            "confidence": r.confidence,
            "ai_model": r.ai_model,
            "created_by": str(r.created_by) if r.created_by else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            "is_deleted": r.is_deleted if hasattr(r, 'is_deleted') else False,
            "deleted_at": r.deleted_at.isoformat() if hasattr(r, 'deleted_at') and r.deleted_at else None,
            "deleted_by": str(r.deleted_by) if hasattr(r, 'deleted_by') and r.deleted_by else None,
        }

    def create(self, data: Dict[str, Any], user_id: str) -> dict:
        """Create a new relation between two entities.

        Args:
            data: Relation data including source_entity_id, target_entity_id, relation_type.
            user_id: The user creating the relation.

        Returns:
            The newly created relation.

        Raises:
            ApiError: If validation fails or entities not found.
        """
        if not data.get("type") or not isinstance(data.get("type"), str) or not data["type"].strip():
            raise ApiError("type is required and must be a non-empty string", 400, "validation_error")
        source_id = data.get("source_id")
        target_id = data.get("target_id")
        if not source_id or not target_id:
            raise ApiError("source_id and target_id are required", 400, "validation_error")
        if source_id == target_id:
            raise ApiError("An entity cannot relate to itself", 400, "validation_error")
        source = EntityRepository().get(source_id)
        if not source:
            raise NotFoundError("Source entity not found")
        target = EntityRepository().get(target_id)
        if not target:
            raise NotFoundError("Target entity not found")
        existing = Relation.query.with_for_update().filter(
            Relation.source_id == source_id,
            Relation.target_id == target_id,
            Relation.type == data["type"],
            Relation.is_deleted.is_(False),
        ).first()
        if existing:
            raise ConflictError("Relation already exists")
        data.setdefault("generated_by", "manual")
        data.setdefault("verified", True)
        relation = RelationRepository().create({**data, "created_by": user_id})
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        EventService().entity_event(
            relation.source_id,
            user_id,
            relation.workspace_id,
            "relation.created",
            {"target_id": str(relation.target_id), "type": relation.type},
        )
        logger.info("relation_created", extra={"relation_id": str(relation.id), "source_id": data.get("source_id"), "target_id": data.get("target_id"), "user_id": user_id})
        return self._to_dict(relation)

    def list_by_workspace(self, workspace_id: str, page: int = 1, per_page: int = 50,
                          relation_type: Optional[str] = None) -> dict:
        query = RelationRepository().query().filter(
            Relation.workspace_id == workspace_id,
            Relation.is_deleted.is_(False),
        )
        if relation_type:
            query = query.filter(Relation.type == relation_type)
        query = query.order_by(Relation.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [self._to_dict(r) for r in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def outgoing(self, entity_id: str, page: int = 1, per_page: int = 50) -> dict:
        pagination = RelationRepository().query().filter(
            Relation.source_id == entity_id,
            Relation.is_deleted.is_(False),
        ).order_by(Relation.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [self._to_dict(r) for r in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def backlinks(self, entity_id: str, page: int = 1, per_page: int = 50) -> dict:
        pagination = RelationRepository().query().filter(
            Relation.target_id == entity_id,
            Relation.is_deleted.is_(False),
        ).order_by(Relation.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [self._to_dict(r) for r in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def update(self, relation_id: str, data: dict) -> dict:
        relation = Relation.query.with_for_update().filter(Relation.id == relation_id).first()
        if not relation:
            raise NotFoundError("Relation not found")
        RelationRepository().update(relation, data)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(relation)

    def delete(self, relation_id: str, user_id: Optional[str] = None) -> dict:
        relation = Relation.query.with_for_update().filter(Relation.id == relation_id).first()
        if not relation:
            raise NotFoundError("Relation not found")
        RelationRepository().soft_delete(relation, deleted_by=user_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        EventService().entity_event(relation.source_id, user_id or "", relation.workspace_id, "relation.deleted", {"relation_id": str(relation.id)})
        logger.info("relation_deleted", extra={"relation_id": relation_id, "user_id": user_id})
        return self._to_dict(relation)

    def restore(self, relation_id: str) -> dict:
        relation = Relation.query.with_for_update().filter(Relation.id == relation_id).first()
        if not relation:
            raise NotFoundError("Relation not found")
        RelationRepository().restore(relation)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        EventService().entity_event(relation.source_id, None, relation.workspace_id, "relation.restored", {"relation_id": str(relation.id)})
        return self._to_dict(relation)

    def bulk_create(self, data_list: List[Dict[str, Any]], user_id: str) -> dict:
        created = []
        errors = []
        try:
            for data in data_list:
                existing = Relation.query.filter_by(
                    source_id=data.get("source_id"),
                    target_id=data.get("target_id"),
                    type=data.get("type"),
                    workspace_id=data.get("workspace_id"),
                    is_deleted=False,
                ).with_for_update().first()
                if existing:
                    if not data.get("allow_duplicate"):
                        errors.append({"data": data, "error": "Relation already exists"})
                        continue
                    created.append(self._to_dict(existing))
                    continue
                relation = RelationRepository().create({**data, "created_by": user_id})
                created.append(self._to_dict(relation))
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return {"created": created, "errors": errors, "total": len(data_list)}
