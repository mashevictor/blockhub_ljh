# -*- coding: utf-8 -*-
"""房地产行业场景 → 正式 capability 映射（SSOT）。

复用 Path A：realestate_ops kinds + house_viewing / property_repair /
deco_material / approval / notify / kb / chart / ops_kpi / data_nl_query。
禁止假 seed；空库空列表。
"""

from __future__ import annotations

from typing import Any

_REALESTATE_ROWS: list[dict[str, Any]] = [
    {
        "name": "看房预约",
        "category": "销售管理",
        "capability_key": "house_viewing",
        "pages": "form+list",
        "problem": "客户看房档期预约；真看房工单。",
        "page_kind": "form_list",
        "form_headline": "看房预约",
        "agent": "house_viewing",
    },
    {
        "name": "签约认购",
        "category": "销售管理",
        "capability_key": "re_contract",
        "pages": "form+list",
        "problem": "认购/签约材料与节点登记。",
        "page_kind": "form_list",
        "form_headline": "签约认购",
        "agent": "re_contract",
        "kb_slug": "re-sales",
    },
    {
        "name": "物业报修",
        "category": "物业服务",
        "capability_key": "property_repair",
        "pages": "form+list",
        "problem": "业主报修工单派工闭环。",
        "page_kind": "form_list",
        "form_headline": "物业报修",
        "agent": "property_repair",
        "kb_slug": "re-property",
    },
    {
        "name": "租金收缴",
        "category": "租赁管理",
        "capability_key": "rent_collection",
        "pages": "form+list",
        "problem": "租金账单登记与催收状态。",
        "page_kind": "form_list",
        "form_headline": "租金收缴",
        "agent": "rent_collection",
    },
    {
        "name": "客户跟进",
        "category": "销售管理",
        "capability_key": "sales_followup",
        "pages": "form+list",
        "problem": "意向客户跟进记录与下次触达。",
        "page_kind": "form_list",
        "form_headline": "客户跟进",
        "agent": "sales_followup",
    },
    {
        "name": "房源上架",
        "category": "房源管理",
        "capability_key": "listing_publish",
        "pages": "form+list",
        "problem": "房源信息审核与上架状态。",
        "page_kind": "form_list",
        "form_headline": "房源上架",
        "agent": "listing_publish",
    },
    {
        "name": "装修验收",
        "category": "工程管理",
        "capability_key": "deco_acceptance",
        "pages": "form+list",
        "problem": "装修节点验收与整改闭环。",
        "page_kind": "form_list",
        "form_headline": "装修验收",
        "agent": "deco_acceptance",
        "default_category": "deco",
    },
    {
        "name": "业主投诉",
        "category": "客户服务",
        "capability_key": "owner_complaint",
        "pages": "form+list",
        "problem": "投诉受理、升级与闭环。",
        "page_kind": "form_list",
        "form_headline": "业主投诉",
        "agent": "owner_complaint",
        "kb_slug": "re-property",
    },
    {
        "name": "租约续签",
        "category": "租赁管理",
        "capability_key": "lease_renewal",
        "pages": "form+list",
        "problem": "租约到期提醒与续签登记。",
        "page_kind": "form_list",
        "form_headline": "租约续签",
        "agent": "lease_renewal",
    },
    {
        "name": "物业费催缴",
        "category": "物业服务",
        "capability_key": "property_fee",
        "pages": "form+list",
        "problem": "物业费账单催缴与回款登记。",
        "page_kind": "form_list",
        "form_headline": "物业费催缴",
        "agent": "property_fee",
    },
    {
        "name": "看房回访",
        "category": "销售管理",
        "capability_key": "viewing_feedback",
        "pages": "form+list",
        "problem": "看房后意向反馈与评级。",
        "page_kind": "form_list",
        "form_headline": "看房回访",
        "agent": "viewing_feedback",
    },
    {
        "name": "中介佣金结算",
        "category": "财务管理",
        "capability_key": "broker_commission",
        "pages": "form+list",
        "problem": "成交佣金对账与结算确认。",
        "page_kind": "form_list",
        "form_headline": "中介佣金",
        "agent": "broker_commission",
    },
    {
        "name": "交房验收",
        "category": "工程管理",
        "capability_key": "deco_acceptance",
        "pages": "form+list",
        "problem": "交房节点验收与问题清单。",
        "page_kind": "form_list",
        "form_headline": "交房验收",
        "default_category": "handover",
        "agent": "deco_acceptance",
    },
    {
        "name": "楼盘经营看板",
        "category": "数据分析",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "本租户房源/租金/投诉真计数聚合。",
        "page_kind": "chart",
        "form_headline": "楼盘经营看板",
        "metrics_source": "realestate_ops",
        "agent": "chart_dashboard",
    },
    {
        "name": "房产·楼盘话术与签约知识库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "楼盘卖点与签约材料 RAG；空库空列表。",
        "page_kind": "chat_kb",
        "form_headline": "房产·楼盘话术与签约知识库",
        "kb_slug": "re-sales",
        "agent": "kb_document",
    },
    {
        "name": "房产·物业报修与业主服务库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "报修分类与业主公约 RAG。",
        "page_kind": "chat_kb",
        "form_headline": "房产·物业报修与业主服务库",
        "kb_slug": "re-property",
        "agent": "kb_document",
    },
    {
        "name": "认购会签审批",
        "category": "销售管理",
        "capability_key": "approval_flow",
        "pages": "approval",
        "problem": "认购折扣/特批会签。",
        "page_kind": "form_list",
        "form_headline": "认购会签",
        "default_category": "re_subscribe",
        "agent": "approval_flow",
    },
    {
        "name": "业主通知推送",
        "category": "消息通知",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "停水停电/催缴等业主通知。",
        "page_kind": "notify",
        "form_headline": "业主通知",
        "agent": "notify_im",
    },
    {
        "name": "装修选材",
        "category": "工程管理",
        "capability_key": "deco_material",
        "pages": "form+list",
        "problem": "装修材料选型与确认。",
        "page_kind": "form_list",
        "form_headline": "装修选材",
        "agent": "deco_material",
    },
    {
        "name": "租赁经营KPI",
        "category": "经营管理",
        "capability_key": "ops_kpi",
        "pages": "chart",
        "problem": "出租率、回款率等 KPI 真记录。",
        "page_kind": "chart",
        "form_headline": "租赁经营KPI",
        "default_category": "re_lease_kpi",
        "agent": "ops_kpi",
    },
    {
        "name": "房源智能问数",
        "category": "数据分析",
        "capability_key": "data_nl_query",
        "pages": "chart",
        "problem": "自然语言查询本租户房产聚合。",
        "page_kind": "chart",
        "form_headline": "房源智能问数",
        "agent": "data_nl_query",
    },
    {
        "name": "空置房巡检",
        "category": "物业服务",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "空置房定期巡检打卡。",
        "page_kind": "form_list",
        "form_headline": "空置房巡检",
        "agent": "site_patrol",
    },
]

VERTICAL_ROWS: dict[str, list[dict[str, Any]]] = {
    "realestate": _REALESTATE_ROWS,
}

PACK_META = {
    "name": "房地产",
    "icon": "🏠",
    "color": "#78716c",
    "tagline": "看房签约 · 租赁物业 · 装修验收 · 真表闭环",
}


def scenes_by_name(pack_key: str = "realestate") -> dict[str, dict[str, Any]]:
    return {r["name"]: r for r in VERTICAL_ROWS.get(pack_key, [])}


def pack_scenes(pack_key: str = "realestate") -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for r in VERTICAL_ROWS.get(pack_key, []):
        out.append(
            {
                "name": r["name"],
                "category": r["category"],
                "problem": r["problem"],
                "pages": r.get("pages") or "form+list",
                "standard": "✓",
                "agent": str(r.get("agent") or r["capability_key"]),
            }
        )
    return out


def realestate_pack_scenes() -> list[dict[str, str]]:
    return pack_scenes("realestate")


def enrich_menu_plan_item(plan_item: dict[str, Any], scene_name: str, pack_key: str = "realestate") -> dict[str, Any]:
    row = scenes_by_name(pack_key).get(scene_name)
    if not row:
        return plan_item
    plan_item["capability_key"] = row["capability_key"]
    for k in ("default_category", "form_headline", "page_kind", "metrics_source"):
        if row.get(k) is not None:
            plan_item[k] = row[k]
    if row.get("kb_slug"):
        from app.data.industry_knowledge_bases import industry_kb_defs

        for hub in industry_kb_defs(pack_key):
            if hub["slug"] == row["kb_slug"]:
                plan_item["kb_name"] = hub["name"]
                plan_item["kb_description"] = hub["description"]
                plan_item["kb_slug"] = hub["slug"]
                plan_item["lock_kb"] = True
                break
    return plan_item
