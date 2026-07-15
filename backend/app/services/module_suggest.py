"""模块推荐：意图 Agent（DeepSeek 验证）优先，关键词兜底。"""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.data.capability_registry import ALL_CAPABILITIES
from app.services.deepseek_client import merge_llm_items
from app.services.intent_agent import AGENT_ID, analyze_intent
from app.services.intent_registry import register_from_intent
from app.services.keyword_match import (
    filter_spurious_modules,
    industry_pack_modules,
    industry_pack_scenes,
    match_modules_keyword,
    merge_keyword_with_llm,
    top_industry_hit,
)


def suggest_modules_keyword(user_text: str) -> list[dict]:
    """兼容旧调用方。"""
    return match_modules_keyword(user_text)


def _slug(key: str) -> str:
    k = key.strip().lower().replace(" ", "_").replace("-", "_")
    return re.sub(r"[^a-z0-9_]", "", k)[:32]


def _enrich_parsed_with_registered(parsed: dict[str, Any], registered: dict[str, list[str]]) -> None:
    """把刚注册的行业/能力并入推荐列表。"""
    for raw in parsed.get("new_industries") or []:
        key = _slug(str(raw.get("key", "")))
        if key not in registered.get("industries", []):
            continue
        parsed.setdefault("industries", []).append({
            "key": key,
            "label": str(raw.get("name", key)),
            "reason": str(raw.get("reason", "AI 识别新行业，已自动注册")),
            "score": 7.5,
        })

    for raw in parsed.get("new_capabilities") or []:
        key = _slug(str(raw.get("key", "")))
        if not key.startswith("custom_"):
            key = f"custom_{key}"
        if key not in registered.get("capabilities", []):
            continue
        entry = {
            "key": key,
            "name": str(raw.get("name", key)),
            "category": str(raw.get("category", "扩展能力")),
            "flutter_pkg": str(raw.get("flutter_pkg", "")),
            "reason": str(raw.get("reason", "AI 补充能力，已自动注册")),
        }
        parsed.setdefault("supplemented", []).append(entry)


def _validation_payload(parsed: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": parsed.get("status", "unclear"),
        "confidence": float(parsed.get("confidence", 0)),
        "intent_summary": parsed.get("intent_summary", ""),
        "rejection_reason": parsed.get("rejection_reason", ""),
        "guidance": parsed.get("guidance", ""),
    }


def suggest_modules(
    user_text: str,
    *,
    force_llm: bool = False,
    use_intent_agent: bool | None = None,
    db: Session | None = None,
) -> dict:
    text = user_text.strip()
    empty = {
        "items": [],
        "confidence": 0.0,
        "used_llm": False,
        "agent": "",
        "supplemented": [],
        "registered": {"industries": [], "capabilities": [], "scenes": []},
        "validation": None,
        "top_score": 0.0,
    }
    if len(text) < 2:
        return empty

    keyword_items = match_modules_keyword(text)
    used_llm = False
    supplemented: list[dict] = []
    registered: dict[str, list[str]] = {"industries": [], "capabilities": [], "scenes": []}
    validation: dict[str, Any] | None = None
    parsed: dict[str, Any] | None = None
    llm_items: list[dict] = []

    use_agent = (
        use_intent_agent
        if use_intent_agent is not None
        else (force_llm or bool(settings.deepseek_api_key))
    )
    if use_agent:
        parsed = analyze_intent(text, db=db)
        if parsed:
            used_llm = bool(settings.deepseek_api_key)
            validation = _validation_payload(parsed)

            if parsed.get("status") == "invalid":
                industry_hit = top_industry_hit(text)
                if industry_hit and industry_hit["score"] >= 3.0:
                    top = industry_hit
                    validation = {
                        "status": "valid",
                        "confidence": min(0.85, top["score"] / 10),
                        "intent_summary": f"识别为{top['label']}相关应用需求",
                        "rejection_reason": "",
                        "guidance": f"已匹配「{top['label']}」及相关模块，可继续补充具体场景。",
                    }
                    keyword_items = match_modules_keyword(text)
                else:
                    return {
                        **empty,
                        "used_llm": used_llm,
                        "agent": AGENT_ID,
                        "validation": validation,
                        "confidence": validation["confidence"],
                    }

            if db and (parsed.get("new_industries") or parsed.get("new_capabilities") or parsed.get("new_scenes")):
                try:
                    registered = register_from_intent(db, parsed)
                except Exception:
                    registered = {"industries": [], "capabilities": [], "scenes": []}

            _enrich_parsed_with_registered(parsed, registered)
            llm_items, supplemented = merge_llm_items(parsed)

    keyword_items = merge_keyword_with_llm(keyword_items, llm_items, limit=20)
    # 弹幕高匹配二次抬升：同 key 取高分，确保 >> 优先真 CapShip
    from app.services.hero_preset_match import match_hero_presets

    hero_boost = match_hero_presets(text)
    if hero_boost:
        keyword_items = merge_keyword_with_llm(hero_boost, keyword_items, limit=24)
    keyword_items = filter_spurious_modules(text, keyword_items)

    # 命中行业时：用 20 行业深度包的 scenes + 能力模块补齐（LLM 只猜 2～3 个时仍展开完整包）
    ind_keys = {x["key"] for x in keyword_items if x.get("type") == "industry"}
    if parsed:
        for ind in parsed.get("industries") or []:
            k = str(ind.get("key", "")).strip()
            if k:
                ind_keys.add(k)
    if ind_keys:
        ind_scores = {
            x["key"]: float(x["score"])
            for x in keyword_items
            if x.get("type") == "industry"
        }
        seen_keys = {x["key"] for x in keyword_items}
        extras: list[dict] = []
        for ind_key in ind_keys:
            pack_score = max(7.0, ind_scores.get(ind_key, 5.0))
            for mod_key, mod_name, mod_reason in industry_pack_modules(ind_key):
                if mod_key in seen_keys:
                    continue
                cap = ALL_CAPABILITIES.get(mod_key)
                extras.append({
                    "key": mod_key,
                    "label": mod_name,
                    "type": "module",
                    "score": round(pack_score - 0.3, 1),
                    "reason": mod_reason,
                    "source": "industry_pack",
                    "flutter_pkg": cap.flutter_pkg if cap else "",
                })
                seen_keys.add(mod_key)
            for scene_key, scene_name, scene_cat in industry_pack_scenes(ind_key):
                if scene_key in seen_keys:
                    continue
                extras.append({
                    "key": scene_key,
                    "label": scene_name,
                    "type": "scenario",
                    "score": round(pack_score - 0.6, 1),
                    "reason": f"行业深度包 · {scene_cat}",
                    "source": "industry_pack_scene",
                    "flutter_pkg": "",
                })
                seen_keys.add(scene_key)
        if extras:
            keyword_items = merge_keyword_with_llm(keyword_items, extras, limit=24)
            keyword_items = filter_spurious_modules(text, keyword_items)

    # 弹幕 CapShip 主能力锁定：命中会员/报修等后，剔除审批流等干扰 module
    _CAPSHIP = {
        "device_repair", "quality_inspect", "inventory_count", "member_loyalty",
        "med_triage", "nurse_shift", "game_support", "school_notice", "homework_qa",
        "property_repair", "site_patrol", "class_schedule", "hotel_booking",
        "study_coach", "travel_plan", "legal_case", "gov_service", "pet_clinic", "deco_material", "wedding_plan", "fitness_checkin", "campaign_ops", "house_viewing", "delivery_order", "shanghai_voice",
    }
    hero_caps = {
        x["key"] for x in (hero_boost or [])
        if x.get("type") == "module" and x.get("key") in _CAPSHIP
    }
    if hero_caps:
        allowed = set(hero_caps) | {
            x["key"] for x in (hero_boost or [])
            if x.get("type") in ("module", "industry", "office", "scenario", "capability")
        }
        keyword_items = [
            x for x in keyword_items
            if not (
                x.get("type") == "module"
                and x.get("key") not in allowed
                and (
                    x.get("key") in _CAPSHIP
                    or x.get("key") in ("approval_flow", "approval_inbox", "form_widget", "list_widget")
                    or x.get("source") == "industry_pack"
                )
            )
        ]

    if validation and validation.get("status") in ("valid", "unclear") and keyword_items:
        if not validation.get("intent_summary") and keyword_items:
            ind = next((x for x in keyword_items if x.get("type") == "industry"), None)
            if ind:
                validation = {
                    **validation,
                    "intent_summary": f"识别为{ind['label']}相关应用需求",
                }

    top_score = keyword_items[0]["score"] if keyword_items else 0.0
    confidence = min(1.0, top_score / 10.0) if keyword_items else 0.0
    if validation:
        confidence = max(confidence, float(validation.get("confidence", 0)))

    return {
        "items": keyword_items,
        "confidence": round(confidence, 2),
        "used_llm": used_llm,
        "agent": AGENT_ID if parsed else "",
        "supplemented": supplemented,
        "registered": registered,
        "validation": validation,
        "top_score": top_score,
    }
