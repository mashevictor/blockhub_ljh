"""行业场景 → capability_keys / modules 装配（SSOT）。

将行业包场景清单的 agent/pages 解析为可发布的正式能力，
供创建发布与 Runtime 全量装配使用。
"""

from __future__ import annotations

import re
from typing import Any

from app.data.industry_packs_all import ALL_INDUSTRY_PACKS, pack_meta
from app.services.effective_capability_registry import is_registry_key

# 场景 agent 字段 → 正式 capability key
_AGENT_TO_CAPABILITY: dict[str, str] = {
    "device_repair": "device_repair",
    "chat_qa": "chat_qa",
    "approval": "approval_flow",
    "approval_flow": "approval_flow",
    "approval_inbox": "approval_inbox",
    "kb": "kb_document",
    "kb_document": "kb_document",
    "notify": "notify_inapp",
    "notify_im": "notify_im",
    "notify_inapp": "notify_inapp",
    "report": "chart_dashboard",
    "chart_dashboard": "chart_dashboard",
    "chart_funnel": "chart_funnel",
    "quality_inspect": "quality_inspect",
    "inventory_count": "inventory_count",
    "leave_request": "leave_request",
    "expense_claim": "expense_claim",
    "policy_qa": "policy_qa",
    "hire_onboard": "hire_onboard",
    "sales_lead": "sales_lead",
    "quote_contract": "quote_contract",
    "ops_kpi": "ops_kpi",
    "med_triage": "med_triage",
    "nurse_shift": "nurse_shift",
    "game_support": "game_support",
    "school_notice": "school_notice",
    "homework_qa": "homework_qa",
    "property_repair": "property_repair",
    "site_patrol": "site_patrol",
    "hotel_booking": "hotel_booking",
    "delivery_order": "delivery_order",
    "house_viewing": "house_viewing",
    "campaign_ops": "campaign_ops",
    "gov_service": "gov_service",
    "legal_case": "legal_case",
    "member_loyalty": "member_loyalty",
    "shanghai_voice": "shanghai_voice",
    "integration": "erp_connector",
    "mfg_oee": "mfg_oee",
    "material_issue": "material_issue",
    "maintenance_plan": "maintenance_plan",
    "shift_attendance": "shift_attendance",
    "energy_carbon": "energy_carbon",
    "training_record": "training_record",
    "erp_connector": "erp_connector",
}

# 场景名关键词 → 更贴切的正式能力（覆盖泛化 agent=approval/report）
_NAME_HINTS: list[tuple[tuple[str, ...], str]] = [
    (("质检", "来料", "成品检"), "quality_inspect"),
    (("领料", "退料", "物料领"), "material_issue"),
    (("安环", "隐患", "巡检"), "site_patrol"),
    (("排班", "考勤"), "shift_attendance"),
    (("请假",), "leave_request"),
    (("报销",), "expense_claim"),
    (("报修", "维修", "故障"), "device_repair"),
    (("话术", "线索", "CRM"), "sales_lead"),
    (("报价", "合同"), "quote_contract"),
    (("OEE", "稼动", "生产日报"), "mfg_oee"),
    (("能耗", "碳排"), "energy_carbon"),
    (("漏斗", "KPI"), "chart_dashboard"),
    (("SOP", "工艺"), "chat_qa"),
    (("图纸", "BOM"), "kb_document"),
    (("培训", "上岗证", "技能"), "training_record"),
    (("保养", "维保"), "maintenance_plan"),
    (("提醒", "通知"), "notify_inapp"),
    (("MES", "ERP", "对接", "集成"), "erp_connector"),
]

_PAGE_HINTS: dict[str, list[str]] = {
    "chat": ["chat_qa"],
    "kb": ["kb_document"],
    "approval": ["approval_flow"],
    "form": ["approval_flow"],
    "list": ["approval_inbox"],
    "notify": ["notify_inapp"],
    "chart": ["chart_dashboard"],
    "integration": ["data_nl_query"],
}


def _slug(text: str) -> str:
    s = re.sub(r"[^\w\u4e00-\u9fff]+", "-", (text or "").strip(), flags=re.UNICODE)
    s = re.sub(r"-+", "-", s).strip("-").lower()
    return s[:48] or "scene"


def _keys_from_pages(pages: str) -> list[str]:
    out: list[str] = []
    for part in (pages or "").replace("+", " ").replace("/", " ").split():
        p = part.strip().lower()
        for k in _PAGE_HINTS.get(p, []):
            if k not in out:
                out.append(k)
    return out


def _keys_from_name(name: str) -> list[str]:
    n = name or ""
    for tokens, key in _NAME_HINTS:
        if any(t in n for t in tokens) and is_registry_key(key):
            return [key]
    return []


def resolve_scene_capability_keys(scene: dict[str, Any]) -> list[str]:
    """单场景 → 有序 capability keys。"""
    keys: list[str] = []
    name = str(scene.get("name") or "")
    for k in _keys_from_name(name):
        if k not in keys:
            keys.append(k)

    agent = str(scene.get("agent") or "").strip()
    if agent and agent not in {"—", "-", "custom"}:
        mapped = _AGENT_TO_CAPABILITY.get(agent, agent if is_registry_key(agent) else "")
        if mapped and is_registry_key(mapped) and mapped not in keys:
            keys.append(mapped)

    for k in _keys_from_pages(str(scene.get("pages") or "")):
        if is_registry_key(k) and k not in keys:
            keys.append(k)

    if not keys:
        keys.append("chat_qa")
    return keys


def get_pack_scenes(pack_key: str) -> list[dict[str, Any]]:
    meta = pack_meta(pack_key) or next((p for p in ALL_INDUSTRY_PACKS if p.get("key") == pack_key), None)
    if not meta:
        return []
    return list(meta.get("scenes") or [])


def assemble_industry_pack(
    pack_key: str,
    *,
    scene_names: list[str] | None = None,
) -> dict[str, Any]:
    """行业包全量（或按名称筛选）场景 → 发布装配结果。

    默认全量；若 scene_names 非空则只装配这些场景。
    """
    scenes = get_pack_scenes(pack_key)
    if scene_names:
        wanted = {n.strip() for n in scene_names if n and str(n).strip() and str(n).strip() != "自定义应用"}
        if wanted:
            filtered = [s for s in scenes if str(s.get("name") or "") in wanted]
            if filtered:
                scenes = filtered

    capability_keys: list[str] = []
    modules: list[dict[str, Any]] = []
    scenario_names: list[str] = []
    menu_plan: list[dict[str, str]] = []
    groups: dict[str, list[str]] = {}

    for idx, scene in enumerate(scenes):
        name = str(scene.get("name") or "").strip()
        if not name:
            continue
        category = str(scene.get("category") or "其他").strip() or "其他"
        keys = resolve_scene_capability_keys(scene)
        primary = keys[0]
        scene_key = f"scene_{idx}_{_slug(name)}"
        scenario_names.append(name)
        groups.setdefault(category, []).append(name)
        for k in keys:
            if k not in capability_keys:
                capability_keys.append(k)
        standard = str(scene.get("standard") or "✓")
        modules.append(
            {
                "key": primary,
                "label": name,
                "kind": "module",
                "source": "industry_scene",
                "category": category,
                "scene_name": name,
                "scene_key": scene_key,
                "pages": scene.get("pages") or "",
                "standard": standard,
                "partial": standard in {"部分", "定制", "partial", "custom"},
            }
        )
        menu_plan.append(
            {
                "key": scene_key,
                "label": name,
                "category": category,
                "capability_key": primary,
                "icon": "module",
                "standard": standard,
            }
        )

    if not capability_keys:
        capability_keys = ["chat_qa", "approval_flow", "kb_document"]

    meta = pack_meta(pack_key) or {"name": pack_key, "tagline": ""}
    return {
        "pack_key": pack_key,
        "pack_name": str(meta.get("name") or pack_key),
        "tagline": str(meta.get("tagline") or ""),
        "capability_keys": capability_keys,
        "modules": modules,
        "scenario_names": scenario_names,
        "menu_plan": menu_plan,
        "groups": [{"category": c, "scenes": names} for c, names in groups.items()],
        "scene_count": len(scenario_names),
    }
