"""行业深度包 DeepSeek 丰富 + 第一版静态种子（生产默认）。"""

from __future__ import annotations

from typing import Any

from app.data.industry_enrich_static import PACK_CAPSHIP_MODULES, build_static_enrichment
from app.data.industry_packs_all import pack_meta
from app.services.deepseek_client import deepseek_json_chat
from app.services.llm_text import NO_MARKDOWN_STYLE_RULE, sanitize_llm_plain_text

# 允许 LLM 推荐的能力 key（含 CapShip）
_ALLOWED_MODULE_KEYS = sorted(
    {
        *{k for keys in PACK_CAPSHIP_MODULES.values() for k in keys},
        "chat_qa",
        "approval_flow",
        "kb_document",
        "chart_dashboard",
        "notify_inapp",
        "notify_im",
        "chart_funnel",
        "data_nl_query",
        "shanghai_voice",
        "approval_inbox",
    }
)


def _fallback_enrich(
    pack_key: str,
    *,
    scenes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return build_static_enrichment(pack_key, scenes=scenes)


def _normalize_llm_enrichment(
    pack_key: str,
    parsed: dict[str, Any],
    *,
    scenes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    fb = _fallback_enrich(pack_key, scenes=scenes)
    modules = [m for m in (parsed.get("recommended_modules") or []) if isinstance(m, str) and m in _ALLOWED_MODULE_KEYS]
    if not modules:
        modules = fb["recommended_modules"]
    tips_raw = parsed.get("scene_tips") or []
    tips: list[dict[str, str]] = []
    for t in tips_raw:
        if not isinstance(t, dict):
            continue
        name = str(t.get("name") or "").strip()
        tip = str(t.get("tip") or "").strip()
        if name and tip:
            tips.append({"name": name, "tip": tip})
    if not tips:
        tips = fb["scene_tips"]
    highlights = [
        sanitize_llm_plain_text(h)
        for h in (parsed.get("highlights") or [])
        if isinstance(h, str) and h.strip()
    ]
    tips_clean = [
        {"name": sanitize_llm_plain_text(t["name"]), "tip": sanitize_llm_plain_text(t["tip"])}
        for t in tips
    ]
    return {
        "overview": sanitize_llm_plain_text((parsed.get("overview") or fb["overview"]).strip()),
        "highlights": highlights or fb["highlights"],
        "recommended_modules": modules,
        "scene_tips": tips_clean,
        "source": "deepseek",
    }


def enrich_industry_pack(
    pack_key: str,
    *,
    scenes: list[dict[str, Any]] | None = None,
    force_llm: bool = False,
) -> dict[str, Any]:
    """返回 overview / highlights / recommended_modules / scene_tips。

    - force_llm=False：生产默认第一版静态种子（含 scene_tips）
    - force_llm=True：调 DeepSeek 重新丰富；失败回退静态第一版
    """
    if not force_llm:
        return _fallback_enrich(pack_key, scenes=scenes)

    meta = pack_meta(pack_key)
    pack_name = meta["name"] if meta else pack_key
    tagline = (meta or {}).get("tagline", "")

    scene_lines = []
    for s in (scenes or [])[:12]:
        scene_lines.append(f"- {s.get('name')}: {s.get('problem', '')}")

    allowed = ", ".join(_ALLOWED_MODULE_KEYS)
    system = (
        "你是积木仓 BlockHub 行业解决方案顾问。根据行业包信息输出 JSON："
        '{"overview":"2-3句行业方案总述，强调可落地正式能力",'
        '"highlights":["亮点1","亮点2","亮点3","亮点4"],'
        '"recommended_modules":["capability_key列表"],'
        '"scene_tips":[{"name":"场景名","tip":"1句可执行落地建议，含页面/通知/审批要点"}]}'
        f"recommended_modules 只能从以下 key 中选择：{allowed}。"
        "优先推荐行业专用 CapShip 能力，少用泛化 approval_flow。"
        f"{NO_MARKDOWN_STYLE_RULE}"
    )
    user = (
        f"行业包：{pack_name}（key={pack_key}）\n"
        f"定位：{tagline}\n"
        f"场景列表：\n" + ("\n".join(scene_lines) if scene_lines else "(无)")
    )
    parsed = deepseek_json_chat(system, user, temperature=0.35)
    if not parsed:
        return _fallback_enrich(pack_key, scenes=scenes)
    return _normalize_llm_enrichment(pack_key, parsed, scenes=scenes)
