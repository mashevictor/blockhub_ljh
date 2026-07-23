# -*- coding: utf-8 -*-
"""物流仓储行业场景 → 正式 capability 映射（SSOT）。

复用 Path A：logistics_ops kinds + inventory_count / delivery_order /
chart_dashboard / notify_im / kb / approval / ops_kpi / data_nl_query。
禁止假 seed；空库空列表。
"""

from __future__ import annotations

from typing import Any

_LOGISTICS_ROWS: list[dict[str, Any]] = [
    {
        "name": "运单跟踪",
        "category": "运输管理",
        "capability_key": "waybill_track",
        "pages": "form+list",
        "problem": "干线/城配运单节点可视；真运单工单入库。",
        "page_kind": "form_list",
        "form_headline": "运单跟踪",
        "agent": "waybill_track",
    },
    {
        "name": "入库验收",
        "category": "仓储管理",
        "capability_key": "warehouse_inbound",
        "pages": "form+list",
        "problem": "到货清点、破损登记与上架确认。",
        "page_kind": "form_list",
        "form_headline": "入库验收",
        "agent": "warehouse_inbound",
    },
    {
        "name": "出库拣配",
        "category": "仓储管理",
        "capability_key": "warehouse_outbound",
        "pages": "form+list",
        "problem": "波次拣货、复核出库与承运交接。",
        "page_kind": "form_list",
        "form_headline": "出库拣配",
        "agent": "warehouse_outbound",
    },
    {
        "name": "仓储盘点",
        "category": "仓储管理",
        "capability_key": "inventory_count",
        "pages": "form+list",
        "problem": "周期/动碰盘点任务；真盘点表。",
        "page_kind": "form_list",
        "form_headline": "仓储盘点",
        "agent": "inventory_count",
    },
    {
        "name": "车辆调度",
        "category": "运输管理",
        "capability_key": "fleet_dispatch",
        "pages": "form+list",
        "problem": "车辆/司机与线路任务匹配派发。",
        "page_kind": "form_list",
        "form_headline": "车辆调度",
        "agent": "fleet_dispatch",
    },
    {
        "name": "签收确认",
        "category": "末端配送",
        "capability_key": "pod_signoff",
        "pages": "form+list",
        "problem": "电子签收、拒收与异常回传。",
        "page_kind": "form_list",
        "form_headline": "签收确认 POD",
        "agent": "pod_signoff",
    },
    {
        "name": "异常上报",
        "category": "运营管理",
        "capability_key": "logistics_exception",
        "pages": "form+list",
        "problem": "延误、破损、丢件等异常工单闭环。",
        "page_kind": "form_list",
        "form_headline": "物流异常上报",
        "agent": "logistics_exception",
    },
    {
        "name": "路线任务派发",
        "category": "运输管理",
        "capability_key": "route_task",
        "pages": "form+list",
        "problem": "配送路线任务与站点顺序下发。",
        "page_kind": "form_list",
        "form_headline": "路线任务",
        "agent": "route_task",
    },
    {
        "name": "运费结算",
        "category": "财务管理",
        "capability_key": "freight_settle",
        "pages": "form+list",
        "problem": "承运商运费对账与结算确认。",
        "page_kind": "form_list",
        "form_headline": "运费结算",
        "agent": "freight_settle",
    },
    {
        "name": "冷链告警",
        "category": "特种物流",
        "capability_key": "cold_chain_alert",
        "pages": "form+list",
        "problem": "温湿度超限告警登记与处置。",
        "page_kind": "form_list",
        "form_headline": "冷链告警",
        "agent": "cold_chain_alert",
        "kb_slug": "logistics-cold",
    },
    {
        "name": "装卸排队",
        "category": "场站管理",
        "capability_key": "dock_queue",
        "pages": "form+list",
        "problem": "月台预约、叫号与超时登记。",
        "page_kind": "form_list",
        "form_headline": "装卸排队",
        "agent": "dock_queue",
    },
    {
        "name": "在途可视看板",
        "category": "数据分析",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "本租户运单/异常/冷链真计数聚合。",
        "page_kind": "chart",
        "form_headline": "在途可视看板",
        "metrics_source": "logistics_ops",
        "agent": "chart_dashboard",
    },
    {
        "name": "末端配送单",
        "category": "末端配送",
        "capability_key": "delivery_order",
        "pages": "form+list",
        "problem": "同城末端配送接单与状态流转。",
        "page_kind": "form_list",
        "form_headline": "末端配送",
        "agent": "delivery_order",
    },
    {
        "name": "仓配异常通知",
        "category": "消息通知",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "异常/冷链事件推送企微钉钉飞书。",
        "page_kind": "notify",
        "form_headline": "仓配异常通知",
        "agent": "notify_im",
    },
    {
        "name": "物流·运单异常与仓储SOP库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "异常口径与仓储SOP RAG；空库空列表。",
        "page_kind": "chat_kb",
        "form_headline": "物流·运单异常与仓储SOP库",
        "kb_slug": "logistics-ops",
        "agent": "kb_document",
    },
    {
        "name": "物流·冷链与配送安全知识库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "温控与配送安全口径 RAG。",
        "page_kind": "chat_kb",
        "form_headline": "物流·冷链与配送安全知识库",
        "kb_slug": "logistics-cold",
        "agent": "kb_document",
    },
    {
        "name": "承运商对账审批",
        "category": "财务管理",
        "capability_key": "approval_flow",
        "pages": "approval",
        "problem": "承运商月结对账单会签。",
        "page_kind": "form_list",
        "form_headline": "承运商对账审批",
        "agent": "approval_flow",
        "default_category": "freight_recon",
    },
    {
        "name": "仓间调拨审批",
        "category": "仓储管理",
        "capability_key": "approval_inbox",
        "pages": "approval",
        "problem": "多仓调拨出库审批与待办。",
        "page_kind": "form_list",
        "form_headline": "仓间调拨",
        "agent": "approval_inbox",
    },
    {
        "name": "配送时效KPI",
        "category": "运营管理",
        "capability_key": "ops_kpi",
        "pages": "chart",
        "problem": "准时率、妥投率等运营 KPI 真记录。",
        "page_kind": "chart",
        "form_headline": "配送时效KPI",
        "agent": "ops_kpi",
        "default_category": "logistics_sla",
    },
    {
        "name": "库存与运单查询",
        "category": "数据分析",
        "capability_key": "data_nl_query",
        "pages": "chart",
        "problem": "自然语言查询本租户物流与库存聚合。",
        "page_kind": "chart",
        "form_headline": "库存与运单查询",
        "agent": "data_nl_query",
    },
    {
        "name": "退货入库",
        "category": "仓储管理",
        "capability_key": "warehouse_inbound",
        "pages": "form+list",
        "problem": "拒收/客退回仓验收与上架。",
        "page_kind": "form_list",
        "form_headline": "退货入库",
        "default_category": "return",
        "agent": "warehouse_inbound",
    },
    {
        "name": "危险品入出库登记",
        "category": "特种物流",
        "capability_key": "logistics_exception",
        "pages": "form+list",
        "problem": "危化品入出库合规登记与跟踪。",
        "page_kind": "form_list",
        "form_headline": "危险品登记",
        "default_category": "hazmat",
        "agent": "logistics_exception",
        "kb_slug": "logistics-cold",
    },
]

VERTICAL_ROWS: dict[str, list[dict[str, Any]]] = {
    "logistics": _LOGISTICS_ROWS,
}

PACK_META = {
    "name": "物流仓储",
    "icon": "📦",
    "color": "#ca8a04",
    "tagline": "运单仓配 · 调度签收 · 冷链装卸 · 真表闭环",
}

LOGISTICS_PACK_KEY = "logistics"


def scenes_by_name(pack_key: str = "logistics") -> dict[str, dict[str, Any]]:
    return {r["name"]: r for r in VERTICAL_ROWS.get(pack_key, [])}


def pack_scenes(pack_key: str = "logistics") -> list[dict[str, str]]:
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


def logistics_pack_scenes() -> list[dict[str, str]]:
    return pack_scenes("logistics")


def enrich_menu_plan_item(plan_item: dict[str, Any], scene_name: str, pack_key: str = "logistics") -> dict[str, Any]:
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
