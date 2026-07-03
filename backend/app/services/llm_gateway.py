from __future__ import annotations

import json
import urllib.error
import urllib.request
from collections.abc import Iterator
from typing import Any

from app.core.config import settings

CHAT_SYSTEM_PROMPT = (
    "你是积木仓 BlockHub 的企业智能助手。结合企业管理、办公协同、审批流程与数据分析，"
    "用专业、简洁的中文回答。若不确定，请明确说明并建议查阅正式制度文件。"
)


def llm_configured() -> bool:
    return bool(settings.llm_api_key or settings.deepseek_api_key)


def _api_key() -> str:
    return settings.llm_api_key or settings.deepseek_api_key


def _base_url() -> str:
    return (settings.llm_base_url or settings.deepseek_base_url).rstrip("/")


def _model(preferred: str | None = None) -> str:
    return preferred or settings.llm_model or settings.deepseek_model


def chat_complete(messages: list[dict[str, str]], *, model: str | None = None, temperature: float = 0.7) -> str | None:
    """非流式补全；未配置 Key 时返回 None。"""
    if not llm_configured():
        return None
    url = f"{_base_url()}/chat/completions"
    body = json.dumps({
        "model": _model(model),
        "messages": messages,
        "temperature": temperature,
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
        with urllib.request.urlopen(req, timeout=settings.llm_timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return str(data["choices"][0]["message"]["content"])
    except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError, OSError):
        return None


def stream_chat_deltas(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    temperature: float = 0.7,
) -> Iterator[str]:
    """OpenAI 兼容 SSE 流；逐段 yield 文本 delta。"""
    if not llm_configured():
        return
    url = f"{_base_url()}/chat/completions"
    body = json.dumps({
        "model": _model(model),
        "messages": messages,
        "temperature": temperature,
        "stream": True,
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {_api_key()}",
            "Accept": "text/event-stream",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=settings.llm_timeout) as resp:
            while True:
                raw = resp.readline()
                if not raw:
                    break
                line = raw.decode("utf-8", errors="ignore").strip()
                if not line or not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                if payload == "[DONE]":
                    break
                try:
                    chunk: dict[str, Any] = json.loads(payload)
                    delta = chunk["choices"][0].get("delta") or {}
                    text = delta.get("content")
                    if text:
                        yield text
                except (KeyError, json.JSONDecodeError, IndexError):
                    continue
    except (urllib.error.URLError, TimeoutError, OSError):
        return


def build_chat_messages(user_message: str, history: list[dict[str, str]] | None = None) -> list[dict[str, str]]:
    msgs: list[dict[str, str]] = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
    for item in history or []:
        role = item.get("role")
        content = item.get("content")
        if role in ("user", "assistant") and content:
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": user_message})
    return msgs
