from typing import Any, Dict

from flask import current_app

from app.extensions import db
from app.models import SearchDocument


class Retriever:
    def hybrid_search(self, workspace_id: str, query: str, limit: int = 50) -> Dict[str, Any]:
        keyword = self.keyword_search(workspace_id, query, limit)
        semantic = self.semantic_search(workspace_id, query, limit)
        seen = set()
        combined = []
        for r in keyword.get("results", []) + semantic.get("results", []):
            eid = r.get("entity_id")
            if eid not in seen:
                seen.add(eid)
                combined.append(r)
        return {"results": combined[:limit], "total": len(combined), "method": "hybrid"}

    def semantic_search(self, workspace_id: str, query: str, limit: int = 50) -> Dict[str, Any]:
        from app.ai.embedding_service import EmbeddingService
        embedder = EmbeddingService()
        query_vec = embedder.embed(query)
        return embedder.search(workspace_id, query_vec, limit)

    def keyword_search(self, workspace_id: str, query: str, limit: int = 50) -> Dict[str, Any]:
        filters = [
            SearchDocument.workspace_id == workspace_id,
            SearchDocument.is_deleted.is_(False),
        ]
        if query:
            like = f"%{query}%"
            filters.append(
                db.or_(SearchDocument.title.ilike(like), SearchDocument.content.ilike(like))
            )

        docs = SearchDocument.query.filter(*filters).limit(limit).all()
        return {
            "results": [
                {
                    "entity_id": d.entity_id,
                    "block_id": d.block_id,
                    "title": d.title,
                    "content": (d.content or "")[:200],
                    "content_hash": d.content_hash,
                    "score": None,
                }
                for d in docs
            ],
            "total": len(docs),
            "method": "keyword",
        }

    def full_text_search(self, workspace_id: str, query: str, limit: int = 50) -> Dict[str, Any]:
        mode = current_app.config.get("GNOVIUM_MODE", "local")
        if mode == "cloud":
            from sqlalchemy import func
            tsquery = func.plainto_tsquery("english", query)
            docs = SearchDocument.query.filter(
                SearchDocument.workspace_id == workspace_id,
                SearchDocument.is_deleted.is_(False),
                SearchDocument.search_vector.op("@@")(tsquery),
            ).order_by(
                func.ts_rank(SearchDocument.search_vector, tsquery).desc()
            ).limit(limit).all()
        else:
            like = f"%{query}%"
            docs = SearchDocument.query.filter(
                SearchDocument.workspace_id == workspace_id,
                SearchDocument.is_deleted.is_(False),
                db.or_(SearchDocument.title.ilike(like), SearchDocument.content.ilike(like)),
            ).limit(limit).all()
        return {
            "results": [
                {
                    "entity_id": d.entity_id,
                    "block_id": d.block_id,
                    "title": d.title,
                    "content": (d.content or "")[:200],
                    "content_hash": d.content_hash,
                    "score": None,
                }
                for d in docs
            ],
            "total": len(docs),
            "method": "full_text",
        }

    def graph_aware_retrieval(self, workspace_id: str, query: str, depth: int = 2) -> Dict[str, Any]:
        return {"results": [], "total": 0, "method": "graph_aware", "note": "Graph-aware retrieval not configured"}
