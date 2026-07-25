from datetime import datetime, timezone
from typing import Any, Dict, List

from app.extensions import db
from app.models import Embedding


class EmbeddingService:
    DIMENSION = 1024

    def soft_delete(self, embedding_id: str) -> bool:
        emb = Embedding.query.get(embedding_id)
        if not emb:
            return False
        emb.is_deleted = True
        emb.deleted_at = datetime.now(timezone.utc)
        db.session.commit()
        return True

    def embed(self, text: str) -> List[float]:
        return [0.0] * self.DIMENSION

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [[0.0] * self.DIMENSION for _ in texts]

    def similarity(self, a: List[float], b: List[float]) -> float:
        if len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def search(self, workspace_id: str, query_embedding: List[float], limit: int = 20) -> Dict[str, Any]:
        if not query_embedding:
            return {"results": [], "total": 0}

        rows = Embedding.query.filter(
            Embedding.workspace_id == workspace_id,
            Embedding.is_deleted.is_(False),
        ).all()

        scored = []
        for emb in rows:
            sim = self.similarity(query_embedding, emb.embedding or [])
            scored.append((sim, emb))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:limit]

        return {
            "results": [
                {
                    "entity_id": emb.entity_id,
                    "block_id": emb.block_id,
                    "model": emb.model,
                    "score": score,
                    "content_hash": emb.content_hash,
                }
                for score, emb in top
            ],
            "total": len(scored),
        }
