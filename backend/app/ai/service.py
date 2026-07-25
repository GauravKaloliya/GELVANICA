"""AI service layer."""
from typing import Optional, List, Dict, Any

from app.ai.embedding_service import EmbeddingService
from app.ai.inference import InferenceRuntime
from app.ai.retriever import Retriever


class AIService:
    def __init__(self, inference_runtime=None, embedding_service=None, retriever=None):
        self.inference = inference_runtime or InferenceRuntime()
        self.embedder = embedding_service or EmbeddingService()
        self.retriever = retriever or Retriever()

    def answer(self, query: str, context: Optional[List[Dict]] = None) -> Dict[str, Any]:
        return {"answer": "AI query not yet configured. Please set up an AI provider.", "sources": []}

    def summarize(self, text: str, max_length: int = 500) -> Dict[str, Any]:
        if not text:
            return {"summary": "", "original_length": 0}
        summary = text[:max_length] + ("..." if len(text) > max_length else "")
        return {"summary": summary, "original_length": len(text), "summary_length": len(summary)}

    def recommend(self, entity_id: str, workspace_id: str, _limit: int = 5) -> Dict[str, Any]:
        return {"recommendations": [], "entity_id": entity_id, "message": "AI recommendations not yet configured"}

    def chat(self, messages: List[Dict]) -> Dict[str, Any]:
        return {"response": "AI chat not yet configured. Please set up an AI provider.", "message": {"role": "assistant", "content": "AI assistant is not yet configured."}}

    def generate_embedding(self, text: str) -> List[float]:
        return self.embedder.embed(text)

    def search(self, workspace_id: str, query: str, mode: str = "hybrid", limit: int = 20) -> Dict[str, Any]:
        if mode == "semantic":
            return self.retriever.semantic_search(workspace_id, query, limit)
        elif mode == "keyword":
            return self.retriever.keyword_search(workspace_id, query, limit)
        elif mode == "full_text":
            return self.retriever.full_text_search(workspace_id, query, limit)
        return self.retriever.hybrid_search(workspace_id, query, limit)
