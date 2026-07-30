"""24 个行业深度包 — Catalog seed SSOT（金融拆为银行/券商/保险/基金/消金）。"""

from __future__ import annotations

from typing import Any

from app.data.finance_vertical_capabilities import (
    bank_pack_scenes,
    fintech_pack_scenes,
    fund_pack_scenes,
    insurance_pack_scenes,
    securities_pack_scenes,
)
from app.data.game_scene_capabilities import game_pack_scenes
from app.data.logistics_scene_capabilities import logistics_pack_scenes
from app.data.realestate_scene_capabilities import realestate_pack_scenes
from app.data.retail_scene_capabilities import retail_pack_scenes
from app.data.hotel_scene_capabilities import hotel_pack_scenes
from app.data.mfg_scene_capabilities import mfg_pack_scenes
from app.data.edu_scene_capabilities import edu_pack_scenes
from app.data.energy_scene_capabilities import energy_pack_scenes
from app.data.gov_scene_capabilities import gov_pack_scenes
from app.data.legal_scene_capabilities import legal_pack_scenes
from app.data.hr_scene_capabilities import hr_pack_scenes
from app.data.construction_scene_capabilities import construction_pack_scenes
from app.data.agriculture_scene_capabilities import agriculture_pack_scenes
from app.data.media_scene_capabilities import media_pack_scenes
from app.data.auto_scene_capabilities import auto_pack_scenes
from app.data.marketing_scene_capabilities import marketing_pack_scenes
from app.data.med_scene_capabilities import med_pack_scenes
from app.data.office_scene_capabilities import office_pack_scenes
from app.data.sales_scene_capabilities import sales_pack_scenes


def _scene(
    name: str,
    category: str,
    problem: str,
    *,
    pages: str = "approval+form",
    standard: str = "✓",
    agent: str = "approval",
) -> dict[str, str]:
    return {
        "name": name,
        "category": category,
        "problem": problem,
        "pages": pages,
        "standard": standard,
        "agent": agent,
    }


# 通用办公 Runtime 正式场景（路径 A · 与 Catalog OFFICE_GROUPS 66 条对齐）
_OFFICE_META = {
    "key": "office",
    "name": "通用办公",
    "icon": "🏢",
    "color": "#6366f1",
    "tagline": "人事、财务、审批、知识库一体化",
    "scenes": office_pack_scenes(),
}

_MFG = {
    "key": "mfg",
    "name": "传统制造",
    "icon": "🏭",
    "color": "#3b82f6",
    "tagline": "报修、SOP知识库、质检、MES 打通",
    "scenes": mfg_pack_scenes(),
}

_SALES = {
    "key": "sales",
    "name": "销售行业",
    "icon": "📈",
    "color": "#6366f1",
    "tagline": "话术、漏斗、合同、CRM · 纯销售场景",
    "scenes": sales_pack_scenes(),
}

_MED = {
    "key": "med",
    "name": "医疗健康",
    "icon": "🏥",
    "color": "#10b981",
    "tagline": "AI预问诊、指南RAG、排班、HIS · 真库闭环",
    "scenes": med_pack_scenes(),
}

_GAME = {
    "key": "game",
    "name": "游戏娱乐",
    "icon": "🎮",
    "color": "#a855f7",
    "tagline": "FAQ工单真库、双知识库、活动通知、2048可玩",
    "scenes": game_pack_scenes(),
}

_RETAIL = {
    "key": "retail",
    "name": "零售电商",
    "icon": "🛒",
    "color": "#f97316",
    "tagline": "全渠道履约 · 店仓调拨 · 会员核销 · 真表闭环",
    "scenes": retail_pack_scenes(),
}

_EDU = {
    "key": "edu",
    "name": "教育培训",
    "icon": "🎓",
    "color": "#2563eb",
    "tagline": "课程、题库、排课、家校互通",
    "scenes": edu_pack_scenes(),
}

_BANK = {
    "key": "bank",
    "name": "商业银行",
    "icon": "🏦",
    "color": "#0369a1",
    "tagline": "对公零售 · KYC · 授信 · 反洗钱",
    "scenes": bank_pack_scenes(),
}

_SECURITIES = {
    "key": "securities",
    "name": "证券券商",
    "icon": "📈",
    "color": "#0e7490",
    "tagline": "适当性 · 投研尽调 · 合规 · 产品销售",
    "scenes": securities_pack_scenes(),
}

_INSURANCE = {
    "key": "insurance",
    "name": "保险",
    "icon": "🛡️",
    "color": "#0284c7",
    "tagline": "核保 · 理赔 · 代理人 · 产品说明",
    "scenes": insurance_pack_scenes(),
}

_FUND = {
    "key": "fund",
    "name": "基金资管",
    "icon": "📉",
    "color": "#1d4ed8",
    "tagline": "产品披露 · 投后 · 监管报送",
    "scenes": fund_pack_scenes(),
}

_FINTECH = {
    "key": "fintech",
    "name": "消金金科",
    "icon": "💳",
    "color": "#4338ca",
    "tagline": "风控预警 · 贷后 · 监管报送",
    "scenes": fintech_pack_scenes(),
}

_LOGISTICS = {
    "key": "logistics",
    "name": "物流仓储",
    "icon": "📦",
    "color": "#ca8a04",
    "tagline": "运单仓配 · 调度签收 · 冷链装卸 · 真表闭环",
    "scenes": logistics_pack_scenes(),
}

_REALESTATE = {
    "key": "realestate",
    "name": "房地产",
    "icon": "🏠",
    "color": "#78716c",
    "tagline": "看房签约 · 租赁物业 · 装修验收 · 真表闭环",
    "scenes": realestate_pack_scenes(),
}

_HOTEL = {
    "key": "hotel",
    "name": "酒店餐饮",
    "icon": "🏨",
    "color": "#ec4899",
    "tagline": "房态打扫 · 订位沽清 · 礼宾夜审 · 真表闭环",
    "scenes": hotel_pack_scenes(),
}

_ENERGY = {
    "key": "energy",
    "name": "能源电力",
    "icon": "⚡",
    "color": "#eab308",
    "tagline": "巡检、工单、能耗、安全合规",
    "scenes": energy_pack_scenes(),
}

_GOV = {
    "key": "gov",
    "name": "政务公用",
    "icon": "🏛",
    "color": "#475569",
    "tagline": "办事指南、诉求、审批便民",
    "scenes": gov_pack_scenes(),
}

_LEGAL = {
    "key": "legal",
    "name": "法律服务",
    "icon": "⚖️",
    "color": "#334155",
    "tagline": "案件、合同、法规检索",
    "scenes": legal_pack_scenes(),
}

_HR = {
    "key": "hr",
    "name": "人力资源",
    "icon": "👥",
    "color": "#8b5cf6",
    "tagline": "招聘、绩效、培训、薪酬",
    "scenes": hr_pack_scenes(),
}

_MARKETING = {
    "key": "marketing",
    "name": "市场营销",
    "icon": "📣",
    "color": "#fb923c",
    "tagline": "活动、线索、内容、投放",
    "scenes": marketing_pack_scenes(),
}

_CONSTRUCTION = {
    "key": "construction",
    "name": "建筑工程",
    "icon": "🏗",
    "color": "#b45309",
    "tagline": "进度、安全、材料、验收",
    "scenes": construction_pack_scenes(),
}

_AGRICULTURE = {
    "key": "agriculture",
    "name": "农业",
    "icon": "🌾",
    "color": "#65a30d",
    "tagline": "溯源、巡检、补贴、产销",
    "scenes": agriculture_pack_scenes(),
}

_MEDIA = {
    "key": "media",
    "name": "传媒内容",
    "icon": "📺",
    "color": "#d946ef",
    "tagline": "选题、审核、版权、分发",
    "scenes": media_pack_scenes(),
}

_AUTO = {
    "key": "auto",
    "name": "汽车交通",
    "icon": "🚗",
    "color": "#06b6d4",
    "tagline": "售后、试驾、配件、工单",
    "scenes": auto_pack_scenes(),
}

# Add labels to pack metas (zh-CN + en-US) for Catalog / Accept-Language consumers.
# Mirrors shared/i18n industry.gen.json; keep in sync via scripts/codegen-industry-scene-i18n.py.
_PACK_LABELS_EN: dict[str, tuple[str, str]] = {
    "office": ("General office", "HR, finance, approvals, and knowledge in one place"),
    "mfg": ("Manufacturing", "Repairs, SOP knowledge, QC, and MES connectivity"),
    "sales": ("Sales", "Scripts, funnel, contracts, and CRM — sales-only scenes"),
    "med": ("Healthcare", "Pre-visit AI, guideline RAG, scheduling, HIS closed loop"),
    "game": ("Games & entertainment", "FAQ tickets, dual knowledge bases, events, playable 2048"),
    "retail": ("Retail & e-commerce", "Omnichannel fulfillment · store/warehouse · membership"),
    "edu": ("Education & training", "Courses, question banks, scheduling, school–home links"),
    "bank": ("Commercial banking", "Corporate & retail, KYC, credit, AML"),
    "securities": ("Securities brokerage", "Suitability, research DD, compliance, sales"),
    "insurance": ("Insurance", "Underwriting, claims, agents, product explainers"),
    "fund": ("Funds & asset mgmt", "Disclosures, post-investment, regulatory filings"),
    "fintech": ("Consumer finance / fintech", "Risk alerts, collections, regulatory reporting"),
    "logistics": ("Logistics & warehousing", "Shipments, warehouse, dispatch, proof of delivery"),
    "realestate": ("Real estate", "Showings, contracts, property, maintenance"),
    "hotel": ("Hospitality & dining", "Bookings, shifts, complaints, inspections"),
    "energy": ("Energy & power", "Inspections, work orders, energy use, safety"),
    "gov": ("Government & public", "Service guides, petitions, approvals"),
    "legal": ("Legal services", "Matters, contracts, statute search"),
    "hr": ("Human resources", "Recruiting, performance, training, payroll"),
    "marketing": ("Marketing", "Campaigns, leads, content, media buying"),
    "construction": ("Construction", "Progress, safety, materials, acceptance"),
    "agriculture": ("Agriculture", "Traceability, inspections, subsidies, sales"),
    "media": ("Media & content", "Topics, review, copyright, distribution"),
    "auto": ("Auto & transport", "Aftersales, test drives, parts, tickets"),
}


def _with_labels(pack: dict[str, Any]) -> dict[str, Any]:
    key = pack["key"]
    en_name, en_tag = _PACK_LABELS_EN.get(key, (pack["name"], pack.get("tagline") or ""))
    out = dict(pack)
    out["labels"] = {"zh-CN": pack["name"], "en-US": en_name}
    out["tagline_labels"] = {"zh-CN": pack.get("tagline") or "", "en-US": en_tag}
    return out


ALL_INDUSTRY_PACKS: list[dict[str, Any]] = [
    _with_labels(p)
    for p in (
        _OFFICE_META,
        _MFG,
        _SALES,
        _MED,
        _GAME,
        _RETAIL,
        _EDU,
        _BANK,
        _SECURITIES,
        _INSURANCE,
        _FUND,
        _FINTECH,
        _LOGISTICS,
        _REALESTATE,
        _HOTEL,
        _ENERGY,
        _GOV,
        _LEGAL,
        _HR,
        _MARKETING,
        _CONSTRUCTION,
        _AGRICULTURE,
        _MEDIA,
        _AUTO,
    )
]

ALL_INDUSTRY_KEYS: set[str] = {p["key"] for p in ALL_INDUSTRY_PACKS}


def scene_count_for_pack(key: str) -> int:
    pack = next((p for p in ALL_INDUSTRY_PACKS if p["key"] == key), None)
    return len(pack["scenes"]) if pack else 0


def pack_meta(key: str) -> dict[str, Any] | None:
    return next((p for p in ALL_INDUSTRY_PACKS if p["key"] == key), None)
