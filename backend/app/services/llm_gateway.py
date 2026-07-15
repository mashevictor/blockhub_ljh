from __future__ import annotations

import json
import urllib.error
import urllib.request
from collections.abc import Iterator
from typing import Any

from app.core.config import settings
from app.services.llm_text import NO_MARKDOWN_STYLE_RULE, sanitize_llm_plain_text

CHAT_SYSTEM_PROMPT = (
    "你是积木仓 BlockHub 的企业智能助手。结合企业管理、办公协同、审批流程与数据分析，"
    "用专业、简洁的中文回答。若不确定，请明确说明并建议查阅正式制度文件。"
    f"{NO_MARKDOWN_STYLE_RULE}"
)


def llm_configured() -> bool:
    return bool(settings.llm_api_key or settings.deepseek_api_key)


def _api_key() -> str:
    return settings.llm_api_key or settings.deepseek_api_key


def _base_url() -> str:
    return (settings.llm_base_url or settings.deepseek_base_url).rstrip("/")


def _model(preferred: str | None = None) -> str:
    # runtime 智能问答统一走 DeepSeek（已配置时），忽略前端传入的演示模型名
    if settings.deepseek_api_key and (
        not preferred
        or preferred.startswith("doubao")
        or preferred in ("auto", "default", "deepseek", settings.deepseek_model)
        or not settings.llm_api_key
    ):
        return settings.deepseek_model
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
            raw = str(data["choices"][0]["message"]["content"])
            return sanitize_llm_plain_text(raw) or None
    except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError, OSError):
        return None


def stream_chat_deltas(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    temperature: float = 0.7,
) -> Iterator[str]:
    """OpenAI 兼容 SSE 流；逐段 yield 文本 delta（原始片段，完整清洗在上层累计时做）。"""
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


def build_app_capability_system_prompt(
    *,
    app_name: str,
    capability_keys: list[str] | None = None,
    modules: list[dict] | None = None,
) -> str:
    """按应用已装能力生成 runtime 智能问答 system prompt。"""
    from app.data.capability_registry import ALL_CAPABILITIES

    keys = [k for k in (capability_keys or []) if k and not str(k).startswith("gen_")]
    lines: list[str] = []
    for key in keys[:24]:
        cap = ALL_CAPABILITIES.get(key)
        label = cap.name if cap else key
        cat = cap.category if cap else ""
        lines.append(f"- {key}（{label}{' · ' + cat if cat else ''}）")
    if modules:
        for m in modules[:12]:
            if not isinstance(m, dict):
                continue
            k = str(m.get("key") or "").strip()
            if not k or k in keys:
                continue
            lab = str(m.get("label") or k)
            lines.append(f"- {k}（{lab}）")
    cap_block = "\n".join(lines) if lines else "- （未登记具体模块，按通用企业助手答）"
    name = (app_name or "当前应用").strip()
    return (
        f"你是应用「{name}」内的智能问答助手，只结合本应用已开通能力回答用户问题，"
        "帮助员工理解功能、操作路径与业务注意事项；不要推销无关产品。\n"
        f"本应用能力清单：\n{cap_block}\n"
        "若问题超出上述能力，如实说明并建议在应用内打开对应模块或联系管理员。\n"
        f"{NO_MARKDOWN_STYLE_RULE}"
    )


def build_chat_messages(
    user_message: str,
    history: list[dict[str, str]] | None = None,
    *,
    system_prompt: str | None = None,
) -> list[dict[str, str]]:
    msgs: list[dict[str, str]] = [{"role": "system", "content": system_prompt or CHAT_SYSTEM_PROMPT}]
    for item in history or []:
        role = item.get("role")
        content = item.get("content")
        if role in ("user", "assistant") and content:
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": user_message})
    return msgs
