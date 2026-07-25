"""Service for generating and storing entity embeddings."""
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict

from app.core.logging import logger
from app.extensions import db
from app.models import Block, Embedding, Entity


class EmbeddingService:
    def generate_embeddings(self, entity_id: str) -> Dict[str, Any]:
        entity = Entity.query.filter(Entity.id == entity_id, Entity.is_deleted.is_(False)).first()
        if not entity:
            logger.warning("embedding_entity_not_found", entity_id=entity_id)
            return {"status": "error", "error": "Entity not found"}

        blocks = Block.query.filter(
            Block.entity_id == entity_id,
            Block.is_deleted.is_(False),
        ).order_by(Block.position).all()

        texts = []
        for b in blocks:
            text = (b.content or {}).get("text", "") or ""
            if text.strip():
                texts.append(text)

        if not texts:
            return {"status": "skipped", "reason": "No text content"}

        combined = " ".join(texts)
        content_hash = hashlib.sha256(combined.encode()).hexdigest()

        existing = Embedding.query.filter(
            Embedding.entity_id == entity_id,
            Embedding.workspace_id == entity.workspace_id,
            Embedding.content_hash == content_hash,
            Embedding.is_deleted.is_(False),
        ).first()
        if existing:
            return {"status": "skipped", "reason": "content_hash unchanged"}

        from app.ai.embedding_service import EmbeddingService as AIEmbedder
        ai_embedder = AIEmbedder()
        vector = ai_embedder.embed(combined)
        if vector is not None and len(vector) != 1024:
            logger.warning("embedding_dimension_mismatch", expected=1024, got=len(vector))
            return {"status": "error", "error": f"Embedding dimension mismatch: expected 1024, got {len(vector)}"}

        old = Embedding.query.filter(
            Embedding.entity_id == entity_id,
            Embedding.workspace_id == entity.workspace_id,
            Embedding.is_deleted.is_(False),
        ).all()
        now = datetime.now(timezone.utc)
        for o in old:
            o.is_deleted = True
            o.deleted_at = now

        emb = Embedding(
            workspace_id=entity.workspace_id,
            entity_id=entity_id,
            model="default",
            embedding=vector,
            content_hash=content_hash,
        )
        db.session.add(emb)
        try:
            db.session.commit()
            logger.info("embedding_generated", entity_id=entity_id, content_hash=content_hash)
            return {"status": "success", "content_hash": content_hash}
        except Exception as e:
            db.session.rollback()
            logger.error("embedding_generation_failed", entity_id=entity_id, error=str(e))
            return {"status": "error", "error": str(e)}
