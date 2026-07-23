# -*- coding: utf-8 -*-
"""酒店餐饮行业场景 → 正式 capability 映射（SSOT）。

禁止假 seed；空库空列表。
"""

from __future__ import annotations

from typing import Any

_HOTEL_ROWS: list[dict[str, Any]] = [
    {
        "name": "客房预订",
        "category": "前台客房",
        "capability_key": "hotel_booking",
        "pages": "form+list",
        "problem": "客房预订与排房；真预订能力。",
        "page_kind": "form_list",
        "form_headline": "客房预订",
        "agent": "hotel_booking"
    },
    {
        "name": "房态变更",
        "category": "前台客房",
        "capability_key": "room_status",
        "pages": "form+list",
        "problem": "净房/脏房/维修房态更新。",
        "page_kind": "form_list",
        "form_headline": "房态变更",
        "agent": "room_status"
    },
    {
        "name": "客房打扫",
        "category": "前台客房",
        "capability_key": "hk_task",
        "pages": "form+list",
        "problem": "退房急扫/VIP 打扫任务。",
        "page_kind": "form_list",
        "form_headline": "客房打扫",
        "agent": "hk_task"
    },
    {
        "name": "客房服务",
        "category": "前台客房",
        "capability_key": "room_service",
        "pages": "form+list",
        "problem": "客房服务请求与完成。",
        "page_kind": "form_list",
        "form_headline": "客房服务",
        "agent": "room_service"
    },
    {
        "name": "迷你吧计费",
        "category": "前台客房",
        "capability_key": "minibar_charge",
        "pages": "form+list",
        "problem": "迷你吧消费入账。",
        "page_kind": "form_list",
        "form_headline": "迷你吧计费",
        "agent": "minibar_charge"
    },
    {
        "name": "礼宾需求",
        "category": "前台客房",
        "capability_key": "concierge_req",
        "pages": "form+list",
        "problem": "用车/票务/行李等礼宾办结。",
        "page_kind": "form_list",
        "form_headline": "礼宾需求",
        "agent": "concierge_req"
    },
    {
        "name": "团队入住",
        "category": "前台客房",
        "capability_key": "group_checkin",
        "pages": "form+list",
        "problem": "团队批量入住与间数确认。",
        "page_kind": "form_list",
        "form_headline": "团队入住",
        "agent": "group_checkin"
    },
    {
        "name": "夜审确认",
        "category": "前台客房",
        "capability_key": "night_audit",
        "pages": "form+list",
        "problem": "营业日夜审差异确认。",
        "page_kind": "form_list",
        "form_headline": "夜审确认",
        "agent": "night_audit"
    },
    {
        "name": "失物招领",
        "category": "前台客房",
        "capability_key": "lost_found",
        "pages": "form+list",
        "problem": "失物登记与认领闭环。",
        "page_kind": "form_list",
        "form_headline": "失物招领",
        "agent": "lost_found"
    },
    {
        "name": "客诉处理",
        "category": "前台客房",
        "capability_key": "guest_complaint",
        "pages": "form+list",
        "problem": "客诉登记、升级与结案。",
        "page_kind": "form_list",
        "form_headline": "客诉处理",
        "agent": "guest_complaint",
        "kb_slug": "hotel-service"
    },
    {
        "name": "餐厅订位",
        "category": "餐饮后厨",
        "capability_key": "table_reserve",
        "pages": "form+list",
        "problem": "人数时段桌型订位。",
        "page_kind": "form_list",
        "form_headline": "餐厅订位",
        "agent": "table_reserve"
    },
    {
        "name": "宴会预订",
        "category": "餐饮后厨",
        "capability_key": "banquet_order",
        "pages": "form+list",
        "problem": "宴会档期与需求登记。",
        "page_kind": "form_list",
        "form_headline": "宴会预订",
        "agent": "banquet_order"
    },
    {
        "name": "餐饮点单",
        "category": "餐饮后厨",
        "capability_key": "fnb_order",
        "pages": "form+list",
        "problem": "桌台/客房点单履约。",
        "page_kind": "form_list",
        "form_headline": "餐饮点单",
        "agent": "fnb_order"
    },
    {
        "name": "菜品沽清",
        "category": "餐饮后厨",
        "capability_key": "menu_86",
        "pages": "form+list",
        "problem": "档口沽清与恢复预估。",
        "page_kind": "form_list",
        "form_headline": "菜品沽清",
        "agent": "menu_86"
    },
    {
        "name": "食材申购",
        "category": "餐饮后厨",
        "capability_key": "food_purchase",
        "pages": "form+list",
        "problem": "厨房食材采购申请。",
        "page_kind": "form_list",
        "form_headline": "食材申购",
        "agent": "food_purchase"
    },
    {
        "name": "厨余报损",
        "category": "餐饮后厨",
        "capability_key": "kitchen_waste",
        "pages": "form+list",
        "problem": "厨余/备料过量报损。",
        "page_kind": "form_list",
        "form_headline": "厨余报损",
        "agent": "kitchen_waste"
    },
    {
        "name": "过敏原工单",
        "category": "餐饮后厨",
        "capability_key": "allergen_note",
        "pages": "form+list",
        "problem": "过敏原告知厨房闭环。",
        "page_kind": "form_list",
        "form_headline": "过敏原工单",
        "agent": "allergen_note"
    },
    {
        "name": "库存盘点",
        "category": "餐饮后厨",
        "capability_key": "inventory_count",
        "pages": "form+list",
        "problem": "厨房/酒水库盘点。",
        "page_kind": "form_list",
        "form_headline": "库存盘点",
        "agent": "inventory_count"
    },
    {
        "name": "卫生检查",
        "category": "品质合规",
        "capability_key": "hygiene_check",
        "pages": "form+list",
        "problem": "卫生标准检查与整改。",
        "page_kind": "form_list",
        "form_headline": "卫生检查",
        "agent": "hygiene_check"
    },
    {
        "name": "巡检打卡",
        "category": "品质合规",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "客房公区巡检打卡。",
        "page_kind": "form_list",
        "form_headline": "巡检打卡",
        "agent": "site_patrol"
    },
    {
        "name": "排班调班",
        "category": "人事管理",
        "capability_key": "shift_attendance",
        "pages": "form+list",
        "problem": "客房餐饮排班调班。",
        "page_kind": "form_list",
        "form_headline": "排班调班",
        "agent": "shift_attendance"
    },
    {
        "name": "会员积分",
        "category": "会员营销",
        "capability_key": "member_loyalty",
        "pages": "form+list",
        "problem": "会员积分与权益；真会员能力。",
        "page_kind": "form_list",
        "form_headline": "会员积分",
        "agent": "member_loyalty",
        "kb_slug": "hotel-member"
    },
    {
        "name": "营收日报",
        "category": "经营管理",
        "capability_key": "hotel_revenue",
        "pages": "form+list",
        "problem": "每日客房/餐饮收入登记。",
        "page_kind": "form_list",
        "form_headline": "营收日报",
        "agent": "hotel_revenue"
    },
    {
        "name": "酒店经营看板",
        "category": "数据分析",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "客诉/打扫/订位真计数聚合。",
        "page_kind": "chart",
        "form_headline": "酒店经营看板",
        "metrics_source": "hotel_ops",
        "agent": "chart_dashboard"
    },
    {
        "name": "酒店经营KPI",
        "category": "经营管理",
        "capability_key": "ops_kpi",
        "pages": "chart",
        "problem": "入住率/RevPAR 等 KPI 真记录。",
        "page_kind": "chart",
        "form_headline": "酒店经营KPI",
        "default_category": "hotel_kpi",
        "agent": "ops_kpi"
    },
    {
        "name": "酒店智能问数",
        "category": "数据分析",
        "capability_key": "data_nl_query",
        "pages": "chart",
        "problem": "自然语言查询本租户酒店聚合。",
        "page_kind": "chart",
        "form_headline": "酒店智能问数",
        "agent": "data_nl_query"
    },
    {
        "name": "酒店·服务话术知识库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "客诉话术与服务标准 RAG。",
        "page_kind": "chat_kb",
        "form_headline": "酒店·服务话术知识库",
        "kb_slug": "hotel-service",
        "agent": "kb_document"
    },
    {
        "name": "酒店·会员权益知识库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "会员等级与权益说明 RAG。",
        "page_kind": "chat_kb",
        "form_headline": "酒店·会员权益知识库",
        "kb_slug": "hotel-member",
        "agent": "kb_document"
    },
    {
        "name": "住客通知推送",
        "category": "消息通知",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "活动/停水等住客通知。",
        "page_kind": "notify",
        "form_headline": "住客通知",
        "agent": "notify_im"
    },
    {
        "name": "大额采购审批",
        "category": "餐饮后厨",
        "capability_key": "approval_flow",
        "pages": "approval",
        "problem": "大额食材/物资采购会签。",
        "page_kind": "form_list",
        "form_headline": "大额采购审批",
        "default_category": "hotel_purchase",
        "agent": "approval_flow"
    }
]

VERTICAL_ROWS: dict[str, list[dict[str, Any]]] = {
    "hotel": _HOTEL_ROWS,
}

PACK_META = {
    "name": "酒店餐饮",
    "icon": "🏨",
    "color": "#ec4899",
    "tagline": "房态打扫 · 订位沽清 · 礼宾夜审 · 真表闭环",
}


def scenes_by_name(pack_key: str = "hotel") -> dict[str, dict[str, Any]]:
    return {r["name"]: r for r in VERTICAL_ROWS.get(pack_key, [])}


def pack_scenes(pack_key: str = "hotel") -> list[dict[str, str]]:
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


def hotel_pack_scenes() -> list[dict[str, str]]:
    return pack_scenes("hotel")


def enrich_menu_plan_item(plan_item: dict[str, Any], scene_name: str, pack_key: str = "hotel") -> dict[str, Any]:
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
