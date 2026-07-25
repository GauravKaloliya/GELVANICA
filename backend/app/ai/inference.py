"""Inference runtime and model registry."""
from typing import Optional, List, Dict

from flask import current_app


class InferenceRuntime:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or "default"
        self._dimension = 1024

    def generate(self, prompt: str, _max_tokens: int = 500) -> str:
        mode = current_app.config.get("GNOVIUM_MODE", "local")
        if mode == "cloud":
            return self._cloud_generate(prompt, _max_tokens)
        return f"[Mock] Generated response for: {prompt[:100]}..."

    def _cloud_generate(self, prompt: str, _max_tokens: int = 500) -> str:
        import requests
        api_url = current_app.config.get("CLOUD_API_URL", "https://api.gnovium.com").rstrip("/")
        try:
            resp = requests.post(
                f"{api_url}/v1/ai/generate",
                json={"prompt": prompt, "max_tokens": _max_tokens},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json().get("response", "")
        except Exception as e:
            return f"[Cloud inference error: {e}]"

    def generate_stream(self, prompt: str, _max_tokens: int = 500):
        mode = current_app.config.get("GNOVIUM_MODE", "local")
        if mode == "cloud":
            yield from self._cloud_generate_stream(prompt, _max_tokens)
            return
        yield f"data: [Mock] Generating for: {prompt[:50]}...\n\n"
        yield "data: [DONE]\n\n"

    def _cloud_generate_stream(self, prompt: str, _max_tokens: int = 500):
        import requests
        api_url = current_app.config.get("CLOUD_API_URL", "https://api.gnovium.com").rstrip("/")
        try:
            resp = requests.post(
                f"{api_url}/v1/ai/generate-stream",
                json={"prompt": prompt, "max_tokens": _max_tokens},
                stream=True,
                timeout=60,
            )
            resp.raise_for_status()
            for line in resp.iter_lines(decode_unicode=True):
                if line:
                    yield f"data: {line}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [Cloud inference error: {e}]\n\n"
            yield "data: [DONE]\n\n"

    def embed(self, text: str) -> list:
        mode = current_app.config.get("GNOVIUM_MODE", "local")
        if mode == "cloud":
            return self._cloud_embed(text)
        return [0.0] * self._dimension

    def _cloud_embed(self, text: str) -> list:
        import requests
        api_url = current_app.config.get("CLOUD_API_URL", "https://api.gnovium.com").rstrip("/")
        try:
            resp = requests.post(
                f"{api_url}/v1/ai/embed",
                json={"text": text},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json().get("embedding", [0.0] * self._dimension)
        except Exception:
            return [0.0] * self._dimension


class ModelRegistry:
    def __init__(self):
        self._models: Dict[str, InferenceRuntime] = {}

    def register(self, name: str, runtime: InferenceRuntime):
        self._models[name] = runtime

    def get(self, name: str) -> Optional[InferenceRuntime]:
        return self._models.get(name)

    def list_models(self) -> List[str]:
        return list(self._models.keys())
