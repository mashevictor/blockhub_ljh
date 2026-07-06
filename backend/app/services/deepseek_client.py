"""DeepSeek API 客户端（模块推荐 / 能力补全）。"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request

from app.core.config import settings
from app.data.capability_registry import ALL_CAPABILITIES, capability_catalog_for_llm


def _post_chat(messages: list[dict], *, temperature: float = 0.2) -> str | None:
    if not settings.deepseek_api_key:
        return None
    url = f"{settings.deepseek_base_url.rstrip('/')}/chat/completions"
    body = json.dumps({
        "model": settings.deepseek_model,
        "messages": messages,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.deepseek_api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=settings.deepseek_timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError):
        return None


def deepseek_json_chat(system: str, user: str, *, temperature: float = 0.25) -> dict | None:
    """通用 JSON 对话，失败返回 None。"""
    raw = _post_chat([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], temperature=temperature)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            return None
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            return None


def suggest_with_deepseek(user_text: str) -> dict | None:
    """返回 { items: [{key,label,reason,score,source}], supplemented: [...] }"""
    catalog = capability_catalog_for_llm()
    system = (
        "你是积木仓 BlockHub 的应用架构师。根据用户需求，从已有能力 catalog 中选择 1~5 个最匹配的 module key。"
        "注意：娱乐/游戏/创意类需求（如小游戏、宠物、动画）不要推荐办公模块（审批流、知识库、待办中心等），"
        "应优先 game 行业或 custom_ 扩展能力（如 custom_game_engine、custom_sprite_battle）。"
        "若 catalog 无法覆盖，可在 supplemented 数组中提议 1~2 个新能力（key 以 custom_ 开头，含 name/category/flutter_pkg/reason）。"
        "只返回 JSON：{\"items\":[{\"key\":\"...\",\"name\":\"中文名\",\"reason\":\"...\",\"score\":0-10}],"
        "\"supplemented\":[{\"key\":\"custom_xxx\",\"name\":\"...\",\"category\":\"...\","
        "\"flutter_pkg\":\"...\",\"reason\":\"...\"}]}"
    )
    user = f"用户需求：{user_text}\n\n已有能力 catalog：\n{catalog}"
    raw = _post_chat([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ])
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            return None
        parsed = json.loads(m.group())
    return parsed


def merge_llm_items(parsed: dict) -> tuple[list[dict], list[dict]]:
    items: list[dict] = []
    supplemented: list[dict] = []

    for it in parsed.get("items") or []:
        key = str(it.get("key", "")).strip()
        if not key:
            continue
        cap = ALL_CAPABILITIES.get(key)
        label = str(it.get("name") or it.get("label") or (cap.name if cap else key))
        items.append({
            "key": key,
            "label": label,
            "type": "module" if not key.startswith("custom_") else "supplement",
            "score": float(it.get("score", 7)),
            "reason": str(it.get("reason", "DeepSeek 推荐")),
            "source": "deepseek",
            "flutter_pkg": cap.flutter_pkg if cap else str(it.get("flutter_pkg", "")),
        })

    for sup in parsed.get("supplemented") or []:
        key = str(sup.get("key", "")).strip()
        if not key.startswith("custom_"):
            key = f"custom_{key}" if key else ""
        if not key:
            continue
        supplemented.append({
            "key": key,
            "label": str(sup.get("name", key)),
            "type": "supplement",
            "category": str(sup.get("category", "扩展能力")),
            "flutter_pkg": str(sup.get("flutter_pkg", "")),
            "reason": str(sup.get("reason", "DeepSeek 补充能力")),
            "source": "deepseek_supplement",
        })
        items.append({
            "key": key,
            "label": str(sup.get("name", key)),
            "type": "supplement",
            "score": 6.0,
            "reason": str(sup.get("reason", "DeepSeek 补充能力")),
            "source": "deepseek_supplement",
        })

    return items, supplemented
