from __future__ import annotations

import json
import re
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


def codegen_configured() -> bool:
    """智能出页：CODEGEN_* → LLM_* → DEEPSEEK_*。"""
    return bool(
        settings.codegen_api_key
        or settings.llm_api_key
        or settings.deepseek_api_key
    )


def _api_key() -> str:
    return settings.llm_api_key or settings.deepseek_api_key


def _base_url() -> str:
    return (settings.llm_base_url or settings.deepseek_base_url).rstrip("/")


def _model(preferred: str | None = None) -> str:
    # runtime 智能问答：若配了 LLM_*（强模型）优先用它；否则 DeepSeek
    if settings.llm_api_key and settings.llm_model:
        if not preferred or preferred in ("auto", "default", "llm"):
            return settings.llm_model
    if settings.deepseek_api_key and (
        not preferred
        or preferred.startswith("doubao")
        or preferred in ("auto", "default", "deepseek", settings.deepseek_model)
        or not settings.llm_api_key
    ):
        return settings.deepseek_model
    return preferred or settings.llm_model or settings.deepseek_model


def _intent_endpoint() -> tuple[str, str, str, int]:
    """意图/对话改页：优先 LLM_*（Claude/GPT/Gemini），否则 DeepSeek。"""
    if (settings.llm_api_key or "").strip() and (settings.llm_base_url or "").strip():
        return (
            settings.llm_api_key.strip(),
            settings.llm_base_url.rstrip("/"),
            (settings.llm_model or settings.deepseek_model or "gpt-4o").strip(),
            max(int(settings.llm_timeout or 60), 30),
        )
    if (settings.llm_api_key or "").strip():
        # 有 key 无 base：与 DeepSeek 共用 base（部分网关同址多模型）
        base = (settings.llm_base_url or settings.deepseek_base_url).rstrip("/")
        return (
            settings.llm_api_key.strip(),
            base,
            (settings.llm_model or settings.deepseek_model).strip(),
            max(int(settings.llm_timeout or 60), 30),
        )
    return (
        settings.deepseek_api_key,
        settings.deepseek_base_url.rstrip("/"),
        settings.deepseek_model,
        max(int(settings.deepseek_timeout or 25), 20),
    )


def _codegen_endpoint() -> tuple[str, str, str, int]:
    """智能出页代码生成：CODEGEN_* → LLM_* → DEEPSEEK_*。"""
    if (settings.codegen_api_key or "").strip() and (settings.codegen_base_url or "").strip():
        return (
            settings.codegen_api_key.strip(),
            settings.codegen_base_url.rstrip("/"),
            (settings.codegen_model or settings.llm_model or "gpt-4.1").strip(),
            max(int(settings.codegen_timeout or 120), 60),
        )
    if (settings.codegen_api_key or "").strip():
        base = (settings.codegen_base_url or settings.llm_base_url or settings.deepseek_base_url).rstrip("/")
        model = (settings.codegen_model or settings.llm_model or settings.deepseek_model).strip()
        return (
            settings.codegen_api_key.strip(),
            base,
            model,
            max(int(settings.codegen_timeout or 120), 60),
        )
    if (settings.llm_api_key or "").strip():
        base = (settings.llm_base_url or settings.deepseek_base_url).rstrip("/")
        model = (settings.llm_model or settings.deepseek_model).strip()
        return (
            settings.llm_api_key.strip(),
            base,
            model,
            max(int(settings.codegen_timeout or settings.llm_timeout or 120), 60),
        )
    return (
        settings.deepseek_api_key,
        settings.deepseek_base_url.rstrip("/"),
        settings.deepseek_model,
        max(int(settings.codegen_timeout or 120), 60),
    )


def _parse_json_object(raw: str) -> dict | None:
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            return None
        try:
            data = json.loads(m.group())
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None


def _post_chat_completions(
    *,
    api_key: str,
    base_url: str,
    model: str,
    messages: list[dict[str, str]],
    temperature: float,
    timeout: int,
    json_mode: bool = False,
) -> str | None:
    if not api_key or not base_url or not model:
        return None
    url = f"{base_url.rstrip('/')}/chat/completions"
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return str(data["choices"][0]["message"]["content"])
    except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError, OSError):
        # 部分模型不支持 response_format，降级重试
        if not json_mode:
            return None
        try:
            payload.pop("response_format", None)
            body2 = json.dumps(payload).encode("utf-8")
            req2 = urllib.request.Request(
                url,
                data=body2,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                method="POST",
            )
            with urllib.request.urlopen(req2, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return str(data["choices"][0]["message"]["content"])
        except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError, OSError):
            return None


def intent_json_chat(system: str, user: str, *, temperature: float = 0.25) -> dict | None:
    """对话改页意图解析（优先强 LLM_*）。"""
    if not llm_configured():
        return None
    key, base, model, timeout = _intent_endpoint()
    raw = _post_chat_completions(
        api_key=key,
        base_url=base,
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        timeout=timeout,
        json_mode=True,
    )
    return _parse_json_object(raw or "")


def codegen_json_chat(system: str, user: str, *, temperature: float = 0.35) -> dict | None:
    """智能出页：优先 CODEGEN_*/LLM_* 强代码模型。"""
    if not codegen_configured():
        return None
    key, base, model, timeout = _codegen_endpoint()
    raw = _post_chat_completions(
        api_key=key,
        base_url=base,
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        timeout=timeout,
        json_mode=True,
    )
    return _parse_json_object(raw or "")


def intent_provider_label() -> str:
    if (settings.llm_api_key or "").strip() and (settings.llm_model or "").strip():
        return f"llm:{settings.llm_model}"
    if settings.deepseek_api_key:
        return f"deepseek:{settings.deepseek_model}"
    return "none"


def codegen_provider_label() -> str:
    if (settings.codegen_model or "").strip() and (
        settings.codegen_api_key or settings.llm_api_key or settings.deepseek_api_key
    ):
        return f"codegen:{settings.codegen_model}"
    if (settings.llm_api_key or "").strip() and (settings.llm_model or "").strip():
        return f"llm:{settings.llm_model}"
    if settings.deepseek_api_key:
        return f"deepseek:{settings.deepseek_model}"
    return "none"


def chat_complete(messages: list[dict[str, str]], *, model: str | None = None, temperature: float = 0.7) -> str | None:
    """非流式补全；未配置 Key 时返回 None。"""
    if not llm_configured():
        return None
    raw = _post_chat_completions(
        api_key=_api_key(),
        base_url=_base_url(),
        model=_model(model),
        messages=messages,
        temperature=temperature,
        timeout=max(int(settings.llm_timeout or 60), 20),
        json_mode=False,
    )
    if not raw:
        return None
    return sanitize_llm_plain_text(raw) or None


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
