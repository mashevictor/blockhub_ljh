# -*- coding: utf-8 -*-
"""零售电商行业场景 → 正式 capability 映射（SSOT）。

禁止假 seed；空库空列表。
"""

from __future__ import annotations

from typing import Any

_RETAIL_ROWS: list[dict[str, Any]] = [
    {
        "name": "库存预警",
        "category": "库存供应链",
        "capability_key": "stock_alert",
        "pages": "form+list",
        "problem": "低库存提醒与补货登记；连锁仓店真表。",
        "page_kind": "form_list",
        "form_headline": "库存预警",
        "agent": "stock_alert"
    },
    {
        "name": "门店调拨",
        "category": "库存供应链",
        "capability_key": "store_transfer",
        "pages": "form+list",
        "problem": "店间调拨出库入库闭环。",
        "page_kind": "form_list",
        "form_headline": "门店调拨",
        "agent": "store_transfer"
    },
    {
        "name": "损耗报损",
        "category": "库存供应链",
        "capability_key": "loss_shrinkage",
        "pages": "form+list",
        "problem": "过期/破损/盗损报损确认。",
        "page_kind": "form_list",
        "form_headline": "损耗报损",
        "agent": "loss_shrinkage"
    },
    {
        "name": "库存盘点",
        "category": "库存供应链",
        "capability_key": "inventory_count",
        "pages": "form+list",
        "problem": "门店/仓周期盘点；真盘点工单。",
        "page_kind": "form_list",
        "form_headline": "库存盘点",
        "agent": "inventory_count"
    },
    {
        "name": "供应商对账",
        "category": "库存供应链",
        "capability_key": "supplier_recon",
        "pages": "form+list",
        "problem": "采购对账与差异确认。",
        "page_kind": "form_list",
        "form_headline": "供应商对账",
        "agent": "supplier_recon"
    },
    {
        "name": "订单跟踪",
        "category": "全渠道履约",
        "capability_key": "retail_order",
        "pages": "form+list",
        "problem": "全渠道订单节点跟踪。",
        "page_kind": "form_list",
        "form_headline": "订单跟踪",
        "agent": "retail_order"
    },
    {
        "name": "全渠道自提",
        "category": "全渠道履约",
        "capability_key": "omni_pickup",
        "pages": "form+list",
        "problem": "线上下单到店自提核销。",
        "page_kind": "form_list",
        "form_headline": "全渠道自提",
        "agent": "omni_pickup"
    },
    {
        "name": "外卖履约",
        "category": "全渠道履约",
        "capability_key": "delivery_order",
        "pages": "form+list",
        "problem": "外卖订单履约跟踪。",
        "page_kind": "form_list",
        "form_headline": "外卖履约",
        "agent": "delivery_order"
    },
    {
        "name": "电商仅退款",
        "category": "售后稽核",
        "capability_key": "online_refund",
        "pages": "form+list",
        "problem": "平台仅退款审核与入账。",
        "page_kind": "form_list",
        "form_headline": "电商仅退款",
        "agent": "online_refund"
    },
    {
        "name": "退换货处理",
        "category": "售后稽核",
        "capability_key": "return_exchange",
        "pages": "form+list",
        "problem": "退换货受理与结案。",
        "page_kind": "form_list",
        "form_headline": "退换货",
        "agent": "return_exchange"
    },
    {
        "name": "小票稽核",
        "category": "售后稽核",
        "capability_key": "receipt_audit",
        "pages": "form+list",
        "problem": "折扣/作废/拆单异常稽核。",
        "page_kind": "form_list",
        "form_headline": "小票稽核",
        "agent": "receipt_audit"
    },
    {
        "name": "收银异常",
        "category": "门店运营",
        "capability_key": "pos_exception",
        "pages": "form+list",
        "problem": "收银长短款等异常登记。",
        "page_kind": "form_list",
        "form_headline": "收银异常",
        "agent": "pos_exception"
    },
    {
        "name": "陈列检查",
        "category": "门店运营",
        "capability_key": "display_check",
        "pages": "form+list",
        "problem": "货架陈列标准核查。",
        "page_kind": "form_list",
        "form_headline": "陈列检查",
        "agent": "display_check"
    },
    {
        "name": "补货上架",
        "category": "门店运营",
        "capability_key": "shelf_replenish",
        "pages": "form+list",
        "problem": "补货上架任务闭环。",
        "page_kind": "form_list",
        "form_headline": "补货上架",
        "agent": "shelf_replenish"
    },
    {
        "name": "门店巡检",
        "category": "门店运营",
        "capability_key": "site_patrol",
        "pages": "form+list",
        "problem": "陈列卫生拍照巡检。",
        "page_kind": "form_list",
        "form_headline": "门店巡检",
        "agent": "site_patrol"
    },
    {
        "name": "价格变更",
        "category": "商品管理",
        "capability_key": "price_change",
        "pages": "form+list",
        "problem": "调价申请与生效确认。",
        "page_kind": "form_list",
        "form_headline": "价格变更",
        "agent": "price_change"
    },
    {
        "name": "新品上架",
        "category": "商品管理",
        "capability_key": "new_sku_launch",
        "pages": "form+list",
        "problem": "新品主推门店上架确认。",
        "page_kind": "form_list",
        "form_headline": "新品上架",
        "agent": "new_sku_launch"
    },
    {
        "name": "竞品采价",
        "category": "商品管理",
        "capability_key": "competitor_price",
        "pages": "form+list",
        "problem": "竞品售价采集对比。",
        "page_kind": "form_list",
        "form_headline": "竞品采价",
        "agent": "competitor_price"
    },
    {
        "name": "优惠券核销",
        "category": "会员促销",
        "capability_key": "promo_coupon",
        "pages": "form+list",
        "problem": "门店券码核销登记。",
        "page_kind": "form_list",
        "form_headline": "优惠券核销",
        "agent": "promo_coupon"
    },
    {
        "name": "储值卡充值",
        "category": "会员促销",
        "capability_key": "gift_card",
        "pages": "form+list",
        "problem": "储值/礼品卡充值入账。",
        "page_kind": "form_list",
        "form_headline": "储值卡充值",
        "agent": "gift_card"
    },
    {
        "name": "会员预留",
        "category": "会员促销",
        "capability_key": "vip_hold",
        "pages": "form+list",
        "problem": "会员预留时段与SKU交付。",
        "page_kind": "form_list",
        "form_headline": "会员预留",
        "agent": "vip_hold"
    },
    {
        "name": "会员营销",
        "category": "会员促销",
        "capability_key": "member_loyalty",
        "pages": "form+list",
        "problem": "积分促销触达；真会员能力。",
        "page_kind": "form_list",
        "form_headline": "会员营销",
        "agent": "member_loyalty",
        "kb_slug": "retail-member"
    },
    {
        "name": "促销活动",
        "category": "会员促销",
        "capability_key": "campaign_ops",
        "pages": "form+list",
        "problem": "促销活动立项与执行。",
        "page_kind": "form_list",
        "form_headline": "促销活动",
        "agent": "campaign_ops"
    },
    {
        "name": "零售经营看板",
        "category": "数据分析",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "库存/订单/自提/调拨真计数聚合。",
        "page_kind": "chart",
        "form_headline": "零售经营看板",
        "metrics_source": "retail_ops",
        "agent": "chart_dashboard"
    },
    {
        "name": "零售经营KPI",
        "category": "经营管理",
        "capability_key": "ops_kpi",
        "pages": "chart",
        "problem": "客单/坪效等 KPI 真记录。",
        "page_kind": "chart",
        "form_headline": "零售经营KPI",
        "default_category": "retail_kpi",
        "agent": "ops_kpi"
    },
    {
        "name": "零售智能问数",
        "category": "数据分析",
        "capability_key": "data_nl_query",
        "pages": "chart",
        "problem": "自然语言查询本租户零售聚合。",
        "page_kind": "chart",
        "form_headline": "零售智能问数",
        "agent": "data_nl_query"
    },
    {
        "name": "零售·门店运营知识库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "陈列标准与补货SOP RAG。",
        "page_kind": "chat_kb",
        "form_headline": "零售·门店运营知识库",
        "kb_slug": "retail-ops",
        "agent": "kb_document"
    },
    {
        "name": "零售·会员权益知识库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "积分规则与权益说明 RAG。",
        "page_kind": "chat_kb",
        "form_headline": "零售·会员权益知识库",
        "kb_slug": "retail-member",
        "agent": "kb_document"
    },
    {
        "name": "门店通知推送",
        "category": "消息通知",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "促销/闭店等门店通知。",
        "page_kind": "notify",
        "form_headline": "门店通知",
        "agent": "notify_im"
    },
    {
        "name": "大促折扣审批",
        "category": "门店运营",
        "capability_key": "approval_flow",
        "pages": "approval",
        "problem": "超权限折扣会签（非日常促销主路径）。",
        "page_kind": "form_list",
        "form_headline": "大促折扣审批",
        "default_category": "retail_promo",
        "agent": "approval_flow"
    }
]

VERTICAL_ROWS: dict[str, list[dict[str, Any]]] = {
    "retail": _RETAIL_ROWS,
}

PACK_META = {
    "name": "零售电商",
    "icon": "🛒",
    "color": "#f97316",
    "tagline": "全渠道履约 · 店仓调拨 · 会员核销 · 真表闭环",
}


def scenes_by_name(pack_key: str = "retail") -> dict[str, dict[str, Any]]:
    return {r["name"]: r for r in VERTICAL_ROWS.get(pack_key, [])}


def pack_scenes(pack_key: str = "retail") -> list[dict[str, str]]:
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


def retail_pack_scenes() -> list[dict[str, str]]:
    return pack_scenes("retail")


def enrich_menu_plan_item(plan_item: dict[str, Any], scene_name: str, pack_key: str = "retail") -> dict[str, Any]:
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
