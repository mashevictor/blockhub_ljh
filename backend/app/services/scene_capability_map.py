"""行业场景 → capability_keys / modules 装配（SSOT）。

将行业包场景清单的 agent/pages 解析为可发布的正式能力，
供创建发布与 Runtime 全量装配使用。
"""

from __future__ import annotations

import re
from typing import Any

from app.data.finance_vertical_capabilities import FINANCE_VERTICAL_KEYS
from app.data.finance_vertical_capabilities import enrich_menu_plan_item as enrich_finance_menu_plan_item
from app.data.logistics_scene_capabilities import enrich_menu_plan_item as enrich_logistics_menu_plan_item
from app.data.finance_vertical_capabilities import scenes_by_name as finance_scenes_by_name
from app.data.game_scene_capabilities import enrich_menu_plan_item as enrich_game_menu_plan_item
from app.data.med_scene_capabilities import enrich_menu_plan_item as enrich_med_menu_plan_item
from app.data.office_scene_capabilities import enrich_menu_plan_item as enrich_office_menu_plan_item
from app.data.sales_scene_capabilities import enrich_menu_plan_item as enrich_sales_menu_plan_item
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
    "seal_request": "seal_request",
    "it_ticket": "it_ticket",
    "it_helpdesk": "it_ticket",
    "ops_kpi": "ops_kpi",
    "notify_im": "notify_im",
    "meeting_booking": "meeting_booking",
    "asset_manage": "asset_manage",
    "sales_lead": "sales_lead",
    "quote_contract": "quote_contract",
    "med_triage": "med_triage",
    "nurse_shift": "nurse_shift",
    "game_support": "game_support",
    "game_2048": "game_2048",
    "finance_kyc": "finance_kyc",
    "finance_aml": "finance_aml",
    "credit_approval": "credit_approval",
    "due_diligence": "due_diligence",
    "regulatory_report": "regulatory_report",
    "insurance_case": "insurance_case",
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
    "data_nl_query": "data_nl_query",
    "rbac_page": "rbac_page",
    "chat_qa": "chat_qa",
}

# 场景名关键词 → 更贴切的正式能力（覆盖泛化 agent=approval/report）
_NAME_HINTS: list[tuple[tuple[str, ...], str]] = [
    (("质检", "来料", "成品检"), "quality_inspect"),
    (("领料", "退料", "物料领"), "material_issue"),
    (("安环", "隐患", "巡检"), "site_patrol"),
    (("排班", "考勤统计", "考勤查询"), "shift_attendance"),
    (("加班", "出差"), "leave_request"),
    (("请假",), "leave_request"),
    (("报销", "费用报销", "付款申请", "借款"), "expense_claim"),
    (("用印", "盖章", "签章", "电子签"), "seal_request"),
    (("入职", "招聘", "离职", "onboarding"), "hire_onboard"),
    (("制度政策", "福利政策", "员工手册", "法务咨询", "合规制度"), "policy_qa"),
    (("制度文档", "培训资料", "项目文档", "会议纪要", "内部FAQ", "最佳实践", "IT知识库", "合规制度库", "审计资料"), "kb_document"),
    (("待办", "已办", "代理审批", "超时催办"), "approval_inbox"),
    (("通用审批", "多级会签", "条件分支", "合同审批"), "approval_flow"),
    (("部门看板", "审批效率", "费用汇总", "自定义报表", "自然语言查数", "审批统计"), "ops_kpi"),
    (("IT报障", "报障", "账号权限", "软件安装", "网络/VPN", "VPN"), "it_ticket"),
    (("企微", "钉钉", "飞书", "审批提醒", "公告推送", "订阅消息", "到期提醒", "邮件/短信"), "notify_im"),
    (("会议室",), "meeting_booking"),
    (("资产领用", "资产盘点", "固定资产"), "asset_manage"),
    (("单点登录", "SSO"), "erp_connector"),
    (("报修", "维修", "故障"), "device_repair"),
    (("话术", "线索", "CRM"), "sales_lead"),
    (("报价", "合同"), "quote_contract"),
    (("OEE", "稼动", "生产日报"), "mfg_oee"),
    (("能耗", "碳排"), "energy_carbon"),
    (("漏斗",), "chart_funnel"),
    (("KPI", "业绩排行", "区域分析"), "ops_kpi"),
    (("SOP作业", "作业指导"), "kb_document"),
    (("SOP", "工艺"), "chat_qa"),
    (("图纸", "BOM"), "kb_document"),
    (("培训", "上岗证", "技能"), "training_record"),
    (("保养", "维保"), "maintenance_plan"),
    (("提醒", "通知"), "notify_inapp"),
    (("MES", "ERP", "对接", "集成", "SAP", "用友", "OA", "HR系统"), "erp_connector"),
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

    # Catalog 已写正式 agent（sales/mfg 深度包）时优先，避免与办公同名场景串 key
    agent = str(scene.get("agent") or "").strip()
    if agent and agent not in {"—", "-", "custom", "approval", "report", "notify", "kb", "integration"}:
        mapped = _AGENT_TO_CAPABILITY.get(agent, agent if is_registry_key(agent) else "")
        if mapped and is_registry_key(mapped):
            return [mapped]

    # 办公 / 销售 / 医疗 / 游戏深度包 SSOT（名称精确匹配）
    try:
        from app.data.office_scene_capabilities import OFFICE_SCENES_BY_NAME

        office_row = OFFICE_SCENES_BY_NAME.get(name)
        if office_row:
            ck = str(office_row.get("capability_key") or "")
            if ck and is_registry_key(ck):
                return [ck]
    except Exception:
        pass
    try:
        from app.data.sales_scene_capabilities import SALES_SCENES_BY_NAME

        sales_row = SALES_SCENES_BY_NAME.get(name)
        if sales_row:
            ck = str(sales_row.get("capability_key") or "")
            if ck and is_registry_key(ck):
                return [ck]
    except Exception:
        pass
    try:
        from app.data.med_scene_capabilities import MED_SCENES_BY_NAME

        med_row = MED_SCENES_BY_NAME.get(name)
        if med_row:
            ck = str(med_row.get("capability_key") or "")
            if ck and is_registry_key(ck):
                return [ck]
    except Exception:
        pass
    try:
        from app.data.game_scene_capabilities import GAME_SCENES_BY_NAME

        game_row = GAME_SCENES_BY_NAME.get(name)
        if game_row:
            ck = str(game_row.get("capability_key") or "")
            if ck and is_registry_key(ck):
                return [ck]
    except Exception:
        pass
    try:
        for pk in FINANCE_VERTICAL_KEYS:
            fin_row = finance_scenes_by_name(pk).get(name)
            if fin_row:
                ck = str(fin_row.get("capability_key") or "")
                if ck and is_registry_key(ck):
                    return [ck]
    except Exception:
        pass

    for k in _keys_from_name(name):
        if k not in keys:
            keys.append(k)

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
        plan_item: dict[str, Any] = {
            "key": scene_key,
            "label": name,
            "category": category,
            "capability_key": primary,
            "icon": "module",
            "standard": standard,
        }
        if "加班" in name:
            plan_item["default_category"] = "overtime"
        elif "出差" in name:
            plan_item["default_category"] = "trip"
        elif "借款" in name:
            plan_item["default_category"] = "loan"
        elif "付款" in name:
            plan_item["default_category"] = "payment"
        elif "盘点" in name and primary == "asset_manage":
            plan_item["default_category"] = "inventory"
        if primary == "seal_request":
            plan_item["approval_type"] = "seal"
            plan_item["form_headline"] = "用印申请"
        if pack_key == "office":
            plan_item = enrich_office_menu_plan_item(plan_item, name)
            primary = str(plan_item.get("capability_key") or primary)
            if modules:
                modules[-1]["key"] = primary
            if primary not in capability_keys:
                capability_keys.append(primary)
        elif pack_key == "sales":
            plan_item = enrich_sales_menu_plan_item(plan_item, name)
            primary = str(plan_item.get("capability_key") or primary)
            if modules:
                modules[-1]["key"] = primary
            if primary not in capability_keys:
                capability_keys.append(primary)
        elif pack_key == "med":
            plan_item = enrich_med_menu_plan_item(plan_item, name)
            primary = str(plan_item.get("capability_key") or primary)
            if modules:
                modules[-1]["key"] = primary
            if primary not in capability_keys:
                capability_keys.append(primary)
        elif pack_key == "game":
            plan_item = enrich_game_menu_plan_item(plan_item, name)
            primary = str(plan_item.get("capability_key") or primary)
            if modules:
                modules[-1]["key"] = primary
            if primary not in capability_keys:
                capability_keys.append(primary)
        elif pack_key in FINANCE_VERTICAL_KEYS:
            plan_item = enrich_finance_menu_plan_item(plan_item, name, pack_key)
            primary = str(plan_item.get("capability_key") or primary)
            if modules:
                modules[-1]["key"] = primary
            if primary not in capability_keys:
                capability_keys.append(primary)
        elif pack_key == "logistics":
            plan_item = enrich_logistics_menu_plan_item(plan_item, name, pack_key)
            primary = str(plan_item.get("capability_key") or primary)
            if modules:
                modules[-1]["key"] = primary
            if primary not in capability_keys:
                capability_keys.append(primary)
        menu_plan.append(plan_item)

    if not capability_keys:
        capability_keys = ["chat_qa", "approval_flow", "kb_document"]

    # office / sales / med / game / finance / logistics：以映射表 menu_plan 为准重建 keys
    if (
        pack_key in {"office", "sales", "med", "game", "logistics"}
        or pack_key in FINANCE_VERTICAL_KEYS
    ) and menu_plan:
        rebuilt: list[str] = []
        for item in menu_plan:
            ck = str(item.get("capability_key") or "").strip()
            if ck and ck not in rebuilt and is_registry_key(ck):
                rebuilt.append(ck)
        if rebuilt:
            capability_keys = rebuilt

    meta = pack_meta(pack_key) or {"name": pack_key, "tagline": ""}
    # 每行业挂 2 个专属知识库入口，并为已有 kb 场景锁定 kb_name
    try:
        from app.data.industry_knowledge_bases import ensure_kb_hub_scenes_in_plan

        menu_plan, modules, capability_keys = ensure_kb_hub_scenes_in_plan(
            pack_key,
            menu_plan,
            modules=modules,
            capability_keys=capability_keys,
        )
        # 同步 scenario_names / groups
        for item in menu_plan:
            lab = str(item.get("label") or "")
            if lab and lab not in scenario_names and item.get("category") == "行业知识库":
                scenario_names.append(lab)
                groups.setdefault("行业知识库", []).append(lab)
    except Exception:
        pass

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
        "knowledge_bases": [
            {"name": i.get("kb_name"), "slug": i.get("kb_slug")}
            for i in menu_plan
            if i.get("kb_slug") and i.get("category") == "行业知识库"
        ],
    }
