from typing import Any, Dict, Optional

from flask import current_app

from app.extensions import db
from app.core.logging import logger
from app.models import SearchDocument


class SearchService:
    def search(self, workspace_id: str, query: str, entity_type_id: Optional[str] = None, page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        if not query or len(query.strip()) < 2:
            return {"results": [], "total": 0, "page": page, "per_page": per_page}

        query = query.strip()
        results: Dict[str, Any] = {}
        total = 0
        mode = current_app.config.get("GNOVIUM_MODE", "local")

        params: Dict[str, Any] = {"ws": workspace_id, "q": f"%{query}%"}
        type_filter_sql = ""
        if entity_type_id:
            type_filter_sql = " AND entity_type_id = :etid"
            params["etid"] = entity_type_id

        if mode == "local":
            try:
                fts_query = ' '.join(f'{w}*' for w in query.split() if w)
                if fts_query:
                    combined_sql = """
                        SELECT entity_id, name, block_id, type, snippet, result_type FROM (
                            SELECT id as entity_id, name, NULL as block_id, NULL as type, NULL as snippet, 'entity' as result_type
                            FROM entities
                            WHERE workspace_id = :ws AND is_deleted = 0 AND name LIKE :q""" + type_filter_sql + """
                            UNION
                            SELECT b.entity_id, e.name, b.id as block_id, b.type,
                                   snippet(blocks_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
                                   'block' as result_type
                            FROM blocks_fts
                            JOIN blocks b ON b.rowid = blocks_fts.rowid
                            JOIN entities e ON b.entity_id = e.id
                            WHERE blocks_fts MATCH :fts_q AND b.is_deleted = 0
                                  AND e.workspace_id = :ws AND e.is_deleted = 0""" + (" AND e.entity_type_id = :etid" if entity_type_id else "") + """
                        ) combined
                        LIMIT :lim OFFSET :off
                    """
                    fts_params = {**params, "fts_q": fts_query, "lim": per_page, "off": (page - 1) * per_page}
                    rows = db.session.execute(db.text(combined_sql), fts_params).fetchall()
                    for row in rows:
                        eid = row[0]
                        if eid not in results:
                            results[eid] = {
                                "entity_id": eid,
                                "title": row[1],
                                "block_id": row[2],
                                "block_type": row[3],
                                "snippet": row[4],
                                "type": row[5],
                            }

                    count_sql = """
                        SELECT COUNT(DISTINCT entity_id) FROM (
                            SELECT id as entity_id FROM entities
                            WHERE workspace_id = :ws AND is_deleted = 0 AND name LIKE :q""" + type_filter_sql + """
                            UNION
                            SELECT DISTINCT b.entity_id
                            FROM blocks_fts
                            JOIN blocks b ON b.rowid = blocks_fts.rowid
                            JOIN entities e ON b.entity_id = e.id
                            WHERE blocks_fts MATCH :fts_q AND b.is_deleted = 0
                                  AND e.workspace_id = :ws AND e.is_deleted = 0""" + (" AND e.entity_type_id = :etid" if entity_type_id else "") + """
                        )
                    """
                    total = db.session.execute(db.text(count_sql), {**params, "fts_q": fts_query}).scalar() or 0
                else:
                    title_sql = """
                        SELECT id, name, NULL as snippet, 'entity' as result_type
                        FROM entities
                        WHERE workspace_id = :ws AND is_deleted = 0 AND name LIKE :q""" + type_filter_sql + """
                        LIMIT :lim OFFSET :off
                    """
                    sql_params = {**params, "lim": per_page, "off": (page - 1) * per_page}
                    rows = db.session.execute(db.text(title_sql), sql_params).fetchall()
                    for row in rows:
                        eid = row[0]
                        results[eid] = {
                            "entity_id": eid,
                            "title": row[1],
                            "snippet": row[2],
                            "type": row[3],
                        }

                    count_sql = "SELECT COUNT(*) FROM entities WHERE workspace_id = :ws AND is_deleted = 0 AND name LIKE :q" + type_filter_sql
                    total = db.session.execute(db.text(count_sql), params).scalar() or 0
            except Exception as e:
                logger.warning("Search failed: %s", e)
        else:
            try:
                from sqlalchemy import func
                from app.models import SearchDocument, Entity

                tsquery = func.plainto_tsquery('english', query)
                doc_query = SearchDocument.query.options(db.joinedload(SearchDocument.entity)).filter(
                    SearchDocument.workspace_id == workspace_id,
                    SearchDocument.is_deleted.is_(False),
                    SearchDocument.search_vector.op('@@')(tsquery),
                ).order_by(
                    func.ts_rank(SearchDocument.search_vector, tsquery).desc()
                )
                if entity_type_id:
                    doc_query = doc_query.join(Entity, SearchDocument.entity_id == Entity.id).filter(
                        Entity.entity_type_id == entity_type_id
                    )
                doc_results = doc_query.limit(per_page).offset((page - 1) * per_page).all()
                for doc in doc_results:
                    eid = doc.entity_id
                    if eid not in results:
                        results[eid] = {
                            "entity_id": eid,
                            "title": doc.title,
                            "snippet": (doc.content or "")[:200],
                            "type": "document",
                        }
            except Exception as e:
                logger.debug("tsvector search unavailable: %s", e)

        return {"results": list(results.values()), "total": total, "page": page, "per_page": per_page}

    def rebuild_index(self, workspace_id: str) -> Dict[str, Any]:
        """Rebuild search index for a workspace."""
        mode = current_app.config.get("GNOVIUM_MODE", "local")
        if mode == "local":
            try:
                db.session.execute(db.text(
                    "DELETE FROM blocks_fts WHERE entity_id IN (SELECT id FROM entities WHERE workspace_id = :ws)"
                ), {"ws": workspace_id})
                db.session.execute(db.text(
                    "DELETE FROM search_documents_fts WHERE entity_id IN (SELECT id FROM entities WHERE workspace_id = :ws)"
                ), {"ws": workspace_id})
                blocks = db.session.execute(db.text(
                    "SELECT id, entity_id, type, content, COALESCE(json_extract(content, '$.text'), '') FROM blocks WHERE entity_id IN (SELECT id FROM entities WHERE workspace_id = :ws) AND is_deleted = 0"
                ), {"ws": workspace_id}).fetchall()
                for b in blocks:
                    db.session.execute(db.text(
                        "INSERT INTO blocks_fts(rowid, entity_id, type, content, text) VALUES (:id, :eid, :bt, :ct, :txt)"
                    ), {"id": b[0], "eid": b[1], "bt": b[2], "ct": str(b[3] or {}), "txt": b[4] or ""})
                docs = SearchDocument.query.filter(
                    SearchDocument.workspace_id == workspace_id,
                    SearchDocument.is_deleted.is_(False),
                ).all()
                for doc in docs:
                    db.session.execute(db.text(
                        "INSERT INTO search_documents_fts(rowid, title, content) VALUES (:id, :title, :content)"
                    ), {"id": doc.id, "title": doc.title or "", "content": doc.content or ""})
                db.session.commit()
                logger.info("search_index_rebuilt", extra={"workspace_id": workspace_id, "blocks": len(blocks), "docs": len(docs)})
                return {"rebuilt": True, "blocks_indexed": len(blocks), "documents_indexed": len(docs)}
            except Exception as e:
                db.session.rollback()
                logger.warning("local index rebuild failed: %s", e)
                return {"rebuilt": False, "error": str(e)}
        elif mode == "cloud":
            try:
                from sqlalchemy import text
                db.session.execute(text("""
                    UPDATE search_documents SET search_vector = 
                    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(content, '')), 'B')
                    WHERE workspace_id = :ws
                """), {"ws": workspace_id})
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logger.warning("tsvector rebuild failed: %s", e)
                return {"rebuilt": False, "error": str(e)}
        return {"rebuilt": True}

    def update_entity_search_document(self, entity_id: str):
        """Update search document for entity from its blocks."""
        from app.models import Entity, Block, SearchDocument
        import hashlib

        entity = Entity.query.with_for_update().filter(Entity.id == entity_id).first()
        if not entity:
            return

        blocks = Block.query.filter(
            Block.entity_id == entity_id,
            Block.is_deleted.is_(False),
        ).order_by(Block.position).all()

        content = ' '.join(
            (b.content or {}).get('text', '') or ''
            for b in blocks
        )
        content_hash = hashlib.sha256(content.encode()).hexdigest()

        existing = SearchDocument.query.with_for_update().filter_by(entity_id=entity_id, workspace_id=entity.workspace_id, is_deleted=False).first()
        if existing:
            existing.title = entity.name
            existing.content = content
            existing.content_hash = content_hash
            doc_id = existing.id
        else:
            doc = SearchDocument(
                workspace_id=entity.workspace_id,
                entity_id=entity_id,
                title=entity.name,
                content=content,
                content_hash=content_hash,
            )
            db.session.add(doc)
            db.session.flush()
            doc_id = doc.id

        mode = current_app.config.get("GNOVIUM_MODE", "local")
        if mode == "local":
            try:
                db.session.execute(db.text(
                    "DELETE FROM search_documents_fts WHERE rowid = :id"
                ), {"id": doc_id})
                db.session.execute(db.text(
                    "INSERT INTO search_documents_fts(rowid, title, content) VALUES (:id, :title, :content)"
                ), {"id": doc_id, "title": entity.name or "", "content": content or ""})
                db.session.execute(db.text(
                    "DELETE FROM blocks_fts WHERE entity_id = :eid"
                ), {"eid": entity_id})
                db.session.execute(db.text("""
                    INSERT INTO blocks_fts(rowid, entity_id, type, content, text)
                    SELECT rowid, entity_id, type, content, COALESCE(json_extract(content, '$.text'), '')
                    FROM blocks WHERE entity_id = :eid AND is_deleted = 0
                """), {"eid": entity_id})
            except Exception:
                logger.debug("FTS5 update unavailable for search document")
        try:
            db.session.flush()
        except Exception:
            db.session.rollback()
            raise
