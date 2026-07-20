"""DeepSeek：超出注册表能力 → 生成可预览网页/App 描述（不做完整写盘编译）。

关键：Agent 要理解并泛化用户需求，输出声明式 interactive schema，
禁止用文字列表假冒按键；禁止指望 Runtime 为每个需求写死组件。
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.services.deepseek_client import deepseek_json_chat

logger = logging.getLogger(__name__)

_SYSTEM = """你是积木仓 BlockHub 的低代码页面生成 Agent。
任务：理解用户真实意图并**泛化**成可预览的页面 JSON（不要写恶意脚本）。
只输出 JSON。

核心原则（必须遵守）：
1. 不要把「可点按的工具 UI」写成 heading/list 文字清单（禁止「数字按钮: 7,8,9」这种伪 UI）。
2. 用户要计算器、计数器、骰子、按键面板、小工具等 → 必须输出 interactive 字段（type=tool_pad）。
3. 用户要填单/审批/列表业务 → 用 form 语义（可放在 summary/blocks 说明），interactive 可省略。
4. 泛化：同类需求共用同一交互模型（tool_pad + 安全 ops），不要发明无法执行的自定义脚本。

interactive.tool_pad 可用 ops（白名单）：
append_digit, append_dot, set_value, clear, clear_all, push_binop(+|-|*|/), evaluate,
add(value), random_int(min,max),
unary.fn: neg|percent|sqrt|square|inv|sin_deg|cos_deg|tan_deg|log10|ln|const_pi|const_e

按钮示例：
{"label":"7","style":"digit","ops":[{"op":"append_digit","value":"7"}]}
{"label":"+","style":"op","ops":[{"op":"push_binop","value":"+"}]}
{"label":"=","style":"accent","ops":[{"op":"evaluate"}]}
"""


def _slug(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff]+", "-", (text or "").strip()).strip("-")
    ascii_part = re.sub(r"[^a-z0-9]+", "-", s.encode("ascii", "ignore").decode("ascii").lower()).strip("-")
    return (ascii_part or "generated")[:40]


def _looks_interactive_tool(text: str) -> bool:
    t = text or ""
    keys = (
        "计算器", "科学计算", "calculator", "计数器", "counter", "骰子", "随机",
        "按键", "小工具", "模拟手机", "仿苹果", "交互样式", "tool_pad",
    )
    return any(k in t for k in keys)


def _interactive_fallback(title: str, prompt: str) -> dict[str, Any] | None:
    blob = f"{title} {prompt}"
    if any(w in blob for w in ("计算器", "科学计算", "calculator")):
        # 精简版 schema；完整科学版由 Runtime 意图模板兜底补齐亦可
        return {
            "type": "tool_pad",
            "theme": "phone_dark",
            "columns": 4,
            "hint": "Agent 泛化 tool_pad · 计算器",
            "buttons": [
                {"label": "AC", "style": "fn", "ops": [{"op": "clear_all"}]},
                {"label": "C", "style": "fn", "ops": [{"op": "clear"}]},
                {"label": "±", "style": "fn", "ops": [{"op": "unary", "fn": "neg"}]},
                {"label": "÷", "style": "op", "ops": [{"op": "push_binop", "value": "/"}]},
                {"label": "7", "style": "digit", "ops": [{"op": "append_digit", "value": "7"}]},
                {"label": "8", "style": "digit", "ops": [{"op": "append_digit", "value": "8"}]},
                {"label": "9", "style": "digit", "ops": [{"op": "append_digit", "value": "9"}]},
                {"label": "×", "style": "op", "ops": [{"op": "push_binop", "value": "*"}]},
                {"label": "4", "style": "digit", "ops": [{"op": "append_digit", "value": "4"}]},
                {"label": "5", "style": "digit", "ops": [{"op": "append_digit", "value": "5"}]},
                {"label": "6", "style": "digit", "ops": [{"op": "append_digit", "value": "6"}]},
                {"label": "-", "style": "op", "ops": [{"op": "push_binop", "value": "-"}]},
                {"label": "1", "style": "digit", "ops": [{"op": "append_digit", "value": "1"}]},
                {"label": "2", "style": "digit", "ops": [{"op": "append_digit", "value": "2"}]},
                {"label": "3", "style": "digit", "ops": [{"op": "append_digit", "value": "3"}]},
                {"label": "+", "style": "op", "ops": [{"op": "push_binop", "value": "+"}]},
                {"label": "0", "style": "digit", "ops": [{"op": "append_digit", "value": "0"}]},
                {"label": ".", "style": "digit", "ops": [{"op": "append_dot"}]},
                {"label": "=", "style": "accent", "ops": [{"op": "evaluate"}]},
                {"label": "%", "style": "fn", "ops": [{"op": "unary", "fn": "percent"}]},
            ],
        }
    if any(w in blob for w in ("计数器", "counter")):
        return {
            "type": "tool_pad",
            "theme": "light",
            "columns": 3,
            "hint": "Agent 泛化 tool_pad · 计数器",
            "buttons": [
                {"label": "+1", "style": "accent", "ops": [{"op": "add", "value": 1}]},
                {"label": "+5", "style": "op", "ops": [{"op": "add", "value": 5}]},
                {"label": "-1", "style": "fn", "ops": [{"op": "add", "value": -1}]},
                {"label": "归零", "style": "fn", "ops": [{"op": "clear_all"}]},
            ],
        }
    if any(w in blob for w in ("骰子", "随机")):
        return {
            "type": "tool_pad",
            "theme": "light",
            "columns": 2,
            "hint": "Agent 泛化 tool_pad · 随机",
            "buttons": [
                {"label": "掷骰子", "style": "accent", "ops": [{"op": "random_int", "min": 1, "max": 6}]},
                {"label": "重置", "style": "fn", "ops": [{"op": "clear_all"}]},
            ],
        }
    return None


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
                    "key": "string",
                    "title": "string",
                    "route": "/gen/...",
                    "summary": "string",
                    "blocks": [
                        {"type": "heading|paragraph|list|button", "text": "string", "items": ["optional"]}
                    ],
                    "interactive": {
                        "type": "tool_pad",
                        "theme": "phone_dark|light",
                        "columns": 4,
                        "hint": "string",
                        "buttons": [
                            {
                                "label": "string",
                                "style": "digit|op|fn|accent",
                                "ops": [{"op": "append_digit", "value": "7"}],
                            }
                        ],
                    },
                }
            ],
            "generated_flutter_screens": [
                {"key": "string", "title": "string", "route": "/gen/...", "body": "string", "actions": ["string"]}
            ],
        },
        "rules": [
            "若需求是可点按工具 UI，必须填 interactive，禁止只用 blocks 列表描述按键",
            "理解并泛化：同类工具共用 tool_pad，不要为每个产品名发明无法执行的结构",
        ],
    }

    raw = deepseek_json_chat(
        system=_SYSTEM,
        user=json.dumps(user, ensure_ascii=False),
        temperature=0.35,
    )
    if isinstance(raw, dict) and (raw.get("generated_pages") or raw.get("generated_flutter_screens")):
        return _normalize(raw, unknown, prompt)

    return _fallback(app_name, unknown, prompt)


def _normalize_interactive(raw: Any, title: str, prompt: str) -> dict[str, Any] | None:
    if isinstance(raw, dict) and raw.get("type") == "tool_pad" and isinstance(raw.get("buttons"), list):
        buttons = []
        for b in raw.get("buttons") or []:
            if not isinstance(b, dict):
                continue
            label = str(b.get("label") or "").strip()
            ops = b.get("ops")
            if not label or not isinstance(ops, list) or not ops:
                continue
            buttons.append(
                {
                    "label": label[:8],
                    "style": str(b.get("style") or "digit")[:12],
                    "ops": ops[:6],
                }
            )
        if buttons:
            return {
                "type": "tool_pad",
                "theme": str(raw.get("theme") or "phone_dark"),
                "columns": int(raw.get("columns") or 4),
                "hint": str(raw.get("hint") or "")[:120],
                "buttons": buttons[:48],
            }
    return _interactive_fallback(title, prompt) if _looks_interactive_tool(f"{title} {prompt}") else None


def _normalize(raw: dict[str, Any], unknown: list[str], prompt: str = "") -> dict[str, Any]:
    pages: list[dict[str, Any]] = []
    for i, p in enumerate(raw.get("generated_pages") or []):
        if not isinstance(p, dict):
            continue
        orig = unknown[min(i, len(unknown) - 1)] if unknown else ""
        raw_key = str(p.get("key") or orig or "generated")
        if str(orig).startswith("gen_"):
            key = str(orig)
        elif raw_key.startswith("gen_"):
            key = raw_key
        else:
            key = f"gen_{_slug(raw_key)}"
        title = str(p.get("title") or key)[:64]
        route = str(p.get("route") or f"/gen/{_slug(key)}")
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
            # 丢弃「假按键列表」——若有 interactive 则不需要
            if btype == "list" and any(w in text for w in ("数字按钮", "运算符", "科学函数")):
                continue
            blocks.append({"type": btype, "text": text, "items": items})
        interactive = _normalize_interactive(p.get("interactive"), title, prompt)
        if not blocks and not interactive:
            blocks = [{"type": "paragraph", "text": str(p.get("summary") or title), "items": []}]
        page: dict[str, Any] = {
            "key": key,
            "title": title,
            "route": route if "/gen/" in route or route.startswith("/s/") else f"/gen/{_slug(key)}",
            "summary": str(p.get("summary") or "")[:400],
            "blocks": blocks,
            "source": "deepseek",
        }
        if interactive:
            page["interactive"] = interactive
        pages.append(page)

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
        return _fallback("应用", unknown, prompt)
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
        page_key = key if str(key).startswith("gen_") else f"gen_{_slug(key)}"
        slug = _slug(key)
        title = key if any("\u4e00" <= c <= "\u9fff" for c in key) else key.replace("_", " ").title()
        if str(key).startswith("gen_"):
            title = key.replace("gen_", "").replace("_", " ")[:64] or title
        route = f"/gen/{slug}"
        summary = (prompt or f"「{app_name}」的「{title}」能力正在由 AI 生成预览页。").strip()[:400]
        interactive = _interactive_fallback(title, prompt or "")
        page: dict[str, Any] = {
            "key": page_key,
            "title": title[:64],
            "route": route,
            "summary": summary,
            "blocks": [
                {"type": "heading", "text": title, "items": []},
                {"type": "paragraph", "text": summary, "items": []},
            ],
            "source": "fallback",
        }
        if interactive:
            page["interactive"] = interactive
            page["blocks"] = [
                {"type": "paragraph", "text": "可交互工具已按意图泛化为 tool_pad。", "items": []},
            ]
        else:
            page["blocks"].extend(
                [
                    {
                        "type": "list",
                        "text": "下一步",
                        "items": ["可在 Runtime 继续用对话改页", "转正为正式能力包后接真 API"],
                    },
                    {"type": "button", "text": "返回顶部", "items": []},
                ]
            )
        pages.append(page)
        screens.append(
            {
                "key": page_key,
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
