from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

from app.core.config import settings

logger = logging.getLogger(__name__)

BATCH_SIZE = 16


def embedding_configured() -> bool:
    return bool(settings.embedding_api_key or settings.llm_api_key or settings.deepseek_api_key)


def _api_key() -> str:
    return settings.embedding_api_key or settings.llm_api_key or settings.deepseek_api_key


def _base_url() -> str:
    base = settings.embedding_base_url or settings.llm_base_url or settings.deepseek_base_url
    return base.rstrip("/")


def embed_texts(texts: list[str]) -> list[list[float]] | None:
    if not texts or not embedding_configured():
        return None
    out: list[list[float]] = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        vectors = _embed_batch(batch)
        if vectors is None:
            return None
        out.extend(vectors)
    return out


def _embed_batch(texts: list[str]) -> list[list[float]] | None:
    url = f"{_base_url()}/embeddings"
    body = json.dumps({
        "model": settings.embedding_model,
        "input": texts,
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {_api_key()}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=settings.embedding_timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            items = sorted(data["data"], key=lambda x: x["index"])
            return [list(item["embedding"]) for item in items]
    except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError, OSError) as exc:
        logger.warning("Embedding API failed: %s", exc)
        return None
