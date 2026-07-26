from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from sqlalchemy import func

from app.extensions import db
from app.models import Block, Entity, EntityFile, File, Relation
from app.repositories import GovernanceReportRepository
from app.core.errors import NotFoundError
from app.core.logging import logger


def _governance_report_model():
    try:
        from app.models import GovernanceReport as _m
        from sqlalchemy import inspect
        inspect(_m)
        return _m
    except Exception:
        return None


class GovernanceService:
    def health_score_history(self, workspace_id: str, limit: int = 30) -> list:
        GovernanceReport = _governance_report_model()
        if GovernanceReport is None:
            return []
        records = (
            GovernanceReport.query
            .filter_by(workspace_id=workspace_id, type="health_check", is_deleted=False)
            .order_by(GovernanceReport.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "score": r.data.get("health_score", 0) if r.data else 0,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reversed(records)
        ]

    def list_runs(self, workspace_id: str, page: int = 1, per_page: int = 10) -> Dict[str, Any]:
        GovernanceReport = _governance_report_model()
        if GovernanceReport is None:
            return {"items": [], "total": 0, "page": page, "per_page": per_page}
        query = GovernanceReport.query.filter_by(workspace_id=workspace_id).order_by(
            GovernanceReport.created_at.desc()
        )
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [
                {
                    "id": str(r.id),
                    "workspace_id": str(r.workspace_id),
                    "type": r.type,
                    "title": r.title,
                    "status": r.status,
                    "data": r.data,
                    "params": r.params,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in pagination.items
            ],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def get_run(self, run_id: str) -> Dict[str, Any]:
        GovernanceReport = _governance_report_model()
        if GovernanceReport is None:
            raise NotFoundError("Governance report not found")
        report = db.session.get(GovernanceReport, run_id)
        if not report:
            raise NotFoundError("Governance report not found")
        return {
            "id": str(report.id),
            "workspace_id": str(report.workspace_id),
            "type": report.type,
            "title": report.title,
            "status": report.status,
            "data": report.data,
            "params": report.params,
            "created_at": report.created_at.isoformat() if report.created_at else None,
        }

    def create_report(self, data: dict, user_id: str) -> dict:
        GovernanceReport = _governance_report_model()
        if GovernanceReport is None:
            raise NotFoundError("Governance reports are only available in cloud mode")
        from app.repositories import GovernanceReportRepository
        repo = GovernanceReportRepository()
        report = repo.create({
            "workspace_id": data["workspace_id"],
            "type": data["type"],
            "title": data["title"],
            "status": data.get("status", "pending"),
            "data": data.get("data"),
            "params": data.get("params", {}),
            "created_by": user_id,
        })
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return report

    def health(self, workspace_id: str) -> Dict[str, Any]:
        # Note: Multiple queries are intentional for clarity; consolidate if performance becomes an issue
        total_entities = Entity.query.filter_by(workspace_id=workspace_id, is_deleted=False).count()
        total_blocks = Block.query.filter(
            Block.is_deleted.is_(False),
            Block.entity_id.in_(
                db.session.query(Entity.id).filter(
                    Entity.workspace_id == workspace_id, Entity.is_deleted.is_(False)
                )
            ),
        ).count()
        total_relations = Relation.query.filter_by(workspace_id=workspace_id, is_deleted=False).count()

        # Compute sub-metrics for health score
        dup_data = self.duplicates(workspace_id)
        orphan_data = self.orphans(workspace_id)
        stale_data = self.stale(workspace_id)

        score = 100
        score -= min(orphan_data["orphan_entities"], 20)
        score -= min(dup_data["total_duplicates"] * 2, 15)
        score -= min(stale_data["stale_entities"], 15)
        score = max(score, 0)

        result = {
            "entity_count": total_entities,
            "block_count": total_blocks,
            "relation_count": total_relations,
            "duplicate_count": dup_data["total_duplicates"],
            "orphan_count": orphan_data["orphan_entities"],
            "stale_count": stale_data["stale_entities"],
            "health_score": score,
        }

        self._persist_report(workspace_id, result)
        return result

    def _persist_report(self, workspace_id: str, data: Dict[str, Any]) -> None:
        GovernanceReport = _governance_report_model()
        if GovernanceReport is None:
            return
        try:
            repo = GovernanceReportRepository()
            repo.create({
                "workspace_id": workspace_id,
                "type": "health_check",
                "title": f"Health check — {data.get('entity_count', 0)} entities",
                "status": "completed",
                "data": data,
                "params": {},
            })
            db.session.commit()
            logger.info("governance_report_persisted", extra={"workspace_id": workspace_id, "health_score": data["health_score"]})
        except Exception as exc:
            db.session.rollback()
            logger.error("governance_report_persist_failed", extra={"workspace_id": workspace_id, "error": str(exc)})

    def duplicates(self, workspace_id: str) -> Dict[str, Any]:
        dups = (
            db.session.query(Entity.name, Entity.entity_type_id, func.count(Entity.id).label("cnt"))
            .filter(
                Entity.workspace_id == workspace_id,
                Entity.is_deleted.is_(False),
                Entity.name.isnot(None),
                Entity.name != "",
            )
            .group_by(Entity.name, Entity.entity_type_id)
            .having(func.count(Entity.id) > 1)
            .all()
        )
        return {
            "duplicate_entities": [{"name": d.name, "entity_type_id": str(d.entity_type_id), "count": d.cnt} for d in dups],
            "total_duplicates": len(dups),
        }

    def orphans(self, workspace_id: str) -> Dict[str, Any]:
        orphan_entities = Entity.query.filter(
            Entity.workspace_id == workspace_id,
            Entity.is_deleted.is_(False),
            ~db.session.query(EntityFile.id).filter(
                EntityFile.entity_id == Entity.id, EntityFile.is_deleted.is_(False)
            ).exists(),
        ).count()

        orphan_files = File.query.filter(
            File.workspace_id == workspace_id,
            File.is_deleted.is_(False),
            ~db.session.query(EntityFile.id).filter(
                EntityFile.file_id == File.id, EntityFile.is_deleted.is_(False)
            ).exists(),
        ).count()

        return {
            "orphan_entities": orphan_entities,
            "orphan_files": orphan_files,
        }

    def stale(self, workspace_id: str) -> Dict[str, Any]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=90)
        stale_entities = Entity.query.filter(
            Entity.workspace_id == workspace_id,
            Entity.is_deleted.is_(False),
            Entity.updated_at < cutoff,
        ).count()
        return {"stale_entities": stale_entities, "stale_threshold_days": 90}

    def broken_links(self, workspace_id: str) -> Dict[str, Any]:
        """Find relations that point to deleted or missing entities."""
        result = []
        relations = Relation.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        for rel in relations:
            for ref_id in [rel.source_entity_id, rel.target_entity_id]:
                target = Entity.query.get(ref_id)
                if not target or target.is_deleted:
                    entity = Entity.query.get(rel.source_entity_id)
                    result.append({
                        "entity_id": str(entity.id) if entity else str(rel.source_entity_id),
                        "entity_title": entity.name if entity else "Deleted entity",
                        "broken_ref": str(ref_id),
                    })
        return {"items": result, "total": len(result)}

    def naming_issues(self, workspace_id: str) -> Dict[str, Any]:
        """Find entities with naming inconsistencies."""
        result = []
        entities = Entity.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        for entity in entities:
            issues = []
            if entity.name and len(entity.name) > 200:
                issues.append("Name exceeds 200 characters")
            if entity.name and entity.name != entity.name.strip():
                issues.append("Name has leading/trailing whitespace")
            if entity.name and entity.name[0].islower():
                issues.append("Name should start with uppercase")
            if issues:
                result.append({
                    "entity_id": str(entity.id),
                    "entity_title": entity.name or "Untitled",
                    "issue": "; ".join(issues),
                })
        return {"items": result, "total": len(result)}

    def size_warnings(self, workspace_id: str) -> Dict[str, Any]:
        """Find entities with excessive block counts."""
        result = []
        entities = Entity.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        for entity in entities:
            block_count = Block.query.filter_by(entity_id=entity.id, is_deleted=False).count()
            if block_count > 100:
                result.append({
                    "entity_id": str(entity.id),
                    "entity_title": entity.name or "Untitled",
                    "block_count": block_count,
                })
        return {"items": result, "total": len(result)}
