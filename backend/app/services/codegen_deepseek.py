"""DeepSeek：超出注册表能力 → 生成可预览网页/App 描述（不做完整写盘编译）。"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.services.deepseek_client import deepseek_json_chat

logger = logging.getLogger(__name__)

_SYSTEM = """你是积木仓 BlockHub 的低代码页面生成器。
根据用户「超出官方能力包」的需求，输出可安全预览的页面 JSON（不要写真实可执行恶意脚本）。
只输出 JSON，符合给定 schema。"""


def _slug(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff]+", "-", (text or "").strip()).strip("-")
    ascii_part = re.sub(r"[^a-z0-9]+", "-", s.encode("ascii", "ignore").decode("ascii").lower()).strip("-")
    return (ascii_part or "generated")[:40]


def generate_capability_pages(
    *,
    app_name: str,
    unknown_keys: list[str],
    prompt: str,
    web_template_id: str,
    app_ui_id: str,
) -> dict[str, Any]:
    """Call DeepSeek; on failure return deterministic fallback pages."""
    unknown = [k for k in unknown_keys if k] or ["custom_feature"]
    user = {
        "app_name": app_name,
        "unknown_capability_keys": unknown,
        "user_prompt": (prompt or "")[:1200],
        "web_template_id": web_template_id,
        "app_ui_id": app_ui_id,
        "schema": {
            "generated_pages": [
                {
                    "key": "string kebab",
                    "title": "string",
                    "route": "/gen/...",
                    "summary": "string",
                    "blocks": [
                        {"type": "heading|paragraph|list|button", "text": "string", "items": ["optional"]}
                    ],
                }
            ],
            "generated_flutter_screens": [
                {"key": "string", "title": "string", "route": "/gen/...", "body": "string", "actions": ["string"]}
            ],
        },
    }

    raw = deepseek_json_chat(
        system=_SYSTEM,
        user=json.dumps(user, ensure_ascii=False),
        temperature=0.4,
    )
    if isinstance(raw, dict) and (raw.get("generated_pages") or raw.get("generated_flutter_screens")):
        return _normalize(raw, unknown)

    return _fallback(app_name, unknown, prompt)


def _normalize(raw: dict[str, Any], unknown: list[str]) -> dict[str, Any]:
    pages: list[dict[str, Any]] = []
    for i, p in enumerate(raw.get("generated_pages") or []):
        if not isinstance(p, dict):
            continue
        key = str(p.get("key") or unknown[min(i, len(unknown) - 1)])
        key = _slug(key)
        title = str(p.get("title") or key)[:64]
        route = str(p.get("route") or f"/gen/{key}")
        if not route.startswith("/"):
            route = f"/{route}"
        blocks = []
        for b in p.get("blocks") or []:
            if not isinstance(b, dict):
                continue
            btype = str(b.get("type") or "paragraph")
            if btype not in ("heading", "paragraph", "list", "button"):
                btype = "paragraph"
            text = str(b.get("text") or "")[:2000]
            items = [str(x)[:200] for x in (b.get("items") or []) if x][:20]
            blocks.append({"type": btype, "text": text, "items": items})
        if not blocks:
            blocks = [{"type": "paragraph", "text": str(p.get("summary") or title), "items": []}]
        pages.append(
            {
                "key": f"gen_{key}",
                "title": title,
                "route": route if route.startswith("/gen/") else f"/gen/{key}",
                "summary": str(p.get("summary") or "")[:400],
                "blocks": blocks,
                "source": "deepseek",
            }
        )

    screens: list[dict[str, Any]] = []
    for i, s in enumerate(raw.get("generated_flutter_screens") or []):
        if not isinstance(s, dict):
            continue
        key = _slug(str(s.get("key") or unknown[min(i, len(unknown) - 1)]))
        screens.append(
            {
                "key": f"gen_{key}",
                "title": str(s.get("title") or key)[:64],
                "route": str(s.get("route") or f"/gen/{key}"),
                "body": str(s.get("body") or "")[:2000],
                "actions": [str(a)[:80] for a in (s.get("actions") or [])][:8],
                "source": "deepseek",
            }
        )

    if not pages:
        return _fallback("应用", unknown, "")
    if not screens:
        screens = [
            {
                "key": p["key"],
                "title": p["title"],
                "route": p["route"],
                "body": p.get("summary") or p["title"],
                "actions": ["返回"],
                "source": "deepseek",
            }
            for p in pages
        ]
    return {
        "generated_pages": pages,
        "generated_flutter_screens": screens,
        "llm": True,
    }


def _fallback(app_name: str, unknown: list[str], prompt: str) -> dict[str, Any]:
    pages = []
    screens = []
    for key in unknown:
        slug = _slug(key)
        title = key if any("\u4e00" <= c <= "\u9fff" for c in key) else key.replace("_", " ").title()
        route = f"/gen/{slug}"
        summary = (prompt or f"「{app_name}」的「{title}」能力正在由 AI 生成预览页。").strip()[:400]
        pages.append(
            {
                "key": f"gen_{slug}",
                "title": title[:64],
                "route": route,
                "summary": summary,
                "blocks": [
                    {"type": "heading", "text": title, "items": []},
                    {"type": "paragraph", "text": summary, "items": []},
                    {
                        "type": "list",
                        "text": "计划能力点",
                        "items": ["需求澄清", "页面预览", "后续可接入正式能力包"],
                    },
                    {"type": "button", "text": "返回首页", "items": []},
                ],
                "source": "fallback",
            }
        )
        screens.append(
            {
                "key": f"gen_{slug}",
                "title": title[:64],
                "route": route,
                "body": summary,
                "actions": ["返回"],
                "source": "fallback",
            }
        )
    return {
        "generated_pages": pages,
        "generated_flutter_screens": screens,
        "llm": False,
    }
