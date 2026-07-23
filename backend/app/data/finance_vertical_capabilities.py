# -*- coding: utf-8 -*-
"""金融五垂直行业场景 → 正式 capability 映射（SSOT）。

垂直包：bank / securities / insurance / fund / fintech
共享 Path A：finance_kyc / finance_aml / credit_approval / due_diligence /
regulatory_report / insurance_case；复用 kb / approval / legal_case / notify_im / chat / chart。
禁止假 seed；空库空列表。
"""

from __future__ import annotations

from typing import Any

# ── 银行 ──────────────────────────────────────────────
_BANK_ROWS: list[dict[str, Any]] = [
    {
        "name": "对公开户 KYC",
        "category": "对公业务",
        "capability_key": "finance_kyc",
        "pages": "form+list",
        "problem": "对公客户开户身份核验；真 KYC 工单入库。",
        "page_kind": "form_list",
        "default_category": "corporate",
        "form_headline": "对公开户 KYC",
        "agent": "finance_kyc",
    },
    {
        "name": "零售开户 KYC",
        "category": "零售业务",
        "capability_key": "finance_kyc",
        "pages": "form+list",
        "problem": "个人客户开户核验；真 KYC 工单。",
        "page_kind": "form_list",
        "default_category": "retail",
        "form_headline": "零售开户 KYC",
        "agent": "finance_kyc",
    },
    {
        "name": "授信审批",
        "category": "信贷业务",
        "capability_key": "credit_approval",
        "pages": "form+list",
        "problem": "授信额度/担保/评级审批；真授信单。",
        "page_kind": "form_list",
        "form_headline": "授信审批",
        "agent": "credit_approval",
    },
    {
        "name": "反洗钱监测",
        "category": "合规管理",
        "capability_key": "finance_aml",
        "pages": "form+list",
        "problem": "可疑交易识别与上报；真 AML 工单。",
        "page_kind": "form_list",
        "form_headline": "反洗钱监测",
        "agent": "finance_aml",
    },
    {
        "name": "合规审查",
        "category": "合规管理",
        "capability_key": "approval_flow",
        "pages": "approval+kb",
        "problem": "业务合规自检会签；真审批 + 银行合规库。",
        "page_kind": "form_list",
        "default_category": "compliance",
        "form_headline": "合规审查",
        "kb_slug": "bank-compliance",
        "agent": "approval_flow",
    },
    {
        "name": "银行·合规与反洗钱库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "KYC/AML/授信制度 RAG；空库空列表。",
        "page_kind": "chat_kb",
        "form_headline": "银行·合规与反洗钱库",
        "kb_slug": "bank-compliance",
        "agent": "kb_document",
    },
    {
        "name": "银行·产品与信贷说明库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "对公/零售产品与信贷口径 RAG。",
        "page_kind": "chat_kb",
        "form_headline": "银行·产品与信贷说明库",
        "kb_slug": "bank-product",
        "agent": "kb_document",
    },
    {
        "name": "风险经营看板",
        "category": "数据分析",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "本租户 KYC/AML/授信真计数聚合。",
        "page_kind": "chart",
        "form_headline": "风险经营看板",
        "metrics_source": "finance_ops",
        "agent": "chart_dashboard",
    },
]

# ── 券商 ──────────────────────────────────────────────
_SECURITIES_ROWS: list[dict[str, Any]] = [
    {
        "name": "开户适当性",
        "category": "客户管理",
        "capability_key": "finance_kyc",
        "pages": "form+list",
        "problem": "投资者适当性评估与开户核验；真 KYC（suitability）。",
        "page_kind": "form_list",
        "default_category": "suitability",
        "form_headline": "开户适当性",
        "agent": "finance_kyc",
    },
    {
        "name": "投研尽调",
        "category": "投行业务",
        "capability_key": "due_diligence",
        "pages": "form+list",
        "problem": "标的尽调材料协同；真尽调单。",
        "page_kind": "form_list",
        "form_headline": "投研尽调",
        "agent": "due_diligence",
    },
    {
        "name": "券商合规审查",
        "category": "合规管理",
        "capability_key": "approval_flow",
        "pages": "approval+kb",
        "problem": "展业合规自检；真审批 + 券商合规库。",
        "page_kind": "form_list",
        "default_category": "compliance",
        "form_headline": "券商合规审查",
        "kb_slug": "securities-compliance",
        "agent": "approval_flow",
    },
    {
        "name": "产品销售说明",
        "category": "财富管理",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "产品销售适当性与条款检索；锁产品库。",
        "page_kind": "chat_kb",
        "form_headline": "产品销售说明",
        "kb_slug": "securities-product",
        "agent": "kb_document",
    },
    {
        "name": "理财产品问答",
        "category": "客户服务",
        "capability_key": "chat_qa",
        "pages": "chat+kb",
        "problem": "产品说明书智能问答（须配合产品库）。",
        "page_kind": "chat_kb",
        "form_headline": "理财产品问答",
        "kb_slug": "securities-product",
        "agent": "chat_qa",
    },
    {
        "name": "金融合同会签",
        "category": "法务流程",
        "capability_key": "legal_case",
        "pages": "form+list",
        "problem": "经纪/投行合同多级会签；真法务案卷。",
        "page_kind": "form_list",
        "form_headline": "金融合同会签",
        "agent": "legal_case",
    },
    {
        "name": "券商·合规适当性库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "适当性/合规制度 RAG。",
        "page_kind": "chat_kb",
        "kb_slug": "securities-compliance",
        "form_headline": "券商·合规适当性库",
        "agent": "kb_document",
    },
    {
        "name": "券商·产品与投研库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "产品条款与投研口径 RAG。",
        "page_kind": "chat_kb",
        "kb_slug": "securities-product",
        "form_headline": "券商·产品与投研库",
        "agent": "kb_document",
    },
]

# ── 保险 ──────────────────────────────────────────────
_INSURANCE_ROWS: list[dict[str, Any]] = [
    {
        "name": "核保申请",
        "category": "核保业务",
        "capability_key": "insurance_case",
        "pages": "form+list",
        "problem": "承保前核保材料与结论；真保险案卷。",
        "page_kind": "form_list",
        "default_category": "underwrite",
        "form_headline": "核保申请",
        "agent": "insurance_case",
    },
    {
        "name": "理赔受理",
        "category": "理赔业务",
        "capability_key": "insurance_case",
        "pages": "form+list",
        "problem": "出险报案与理赔进度；真保险案卷。",
        "page_kind": "form_list",
        "default_category": "claim",
        "form_headline": "理赔受理",
        "agent": "insurance_case",
    },
    {
        "name": "代理人展业",
        "category": "渠道管理",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "代理人活动/续期提醒；真 IM Webhook。",
        "page_kind": "notify",
        "form_headline": "代理人展业通知",
        "agent": "notify_im",
    },
    {
        "name": "保险产品说明",
        "category": "产品管理",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "条款解读与告知义务检索。",
        "page_kind": "chat_kb",
        "kb_slug": "insurance-product",
        "form_headline": "保险产品说明",
        "agent": "kb_document",
    },
    {
        "name": "保险合规审查",
        "category": "合规管理",
        "capability_key": "approval_flow",
        "pages": "approval+kb",
        "problem": "销售话术与披露合规会签。",
        "page_kind": "form_list",
        "default_category": "compliance",
        "kb_slug": "insurance-compliance",
        "form_headline": "保险合规审查",
        "agent": "approval_flow",
    },
    {
        "name": "保险·合规与告知库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "kb_slug": "insurance-compliance",
        "form_headline": "保险·合规与告知库",
        "problem": "合规与客户告知义务 RAG。",
        "page_kind": "chat_kb",
        "agent": "kb_document",
    },
    {
        "name": "保险·产品条款库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "kb_slug": "insurance-product",
        "form_headline": "保险·产品条款库",
        "problem": "产品条款与理赔口径 RAG。",
        "page_kind": "chat_kb",
        "agent": "kb_document",
    },
]

# ── 基金/资管 ──────────────────────────────────────────
_FUND_ROWS: list[dict[str, Any]] = [
    {
        "name": "产品披露",
        "category": "产品管理",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "基金/资管产品披露文件检索。",
        "page_kind": "chat_kb",
        "kb_slug": "fund-product",
        "form_headline": "产品披露",
        "agent": "kb_document",
    },
    {
        "name": "投后管理",
        "category": "资产管理",
        "capability_key": "due_diligence",
        "pages": "form+list",
        "problem": "投后巡检材料与状态；真尽调/投后单。",
        "page_kind": "form_list",
        "default_category": "post_invest",
        "form_headline": "投后管理",
        "agent": "due_diligence",
    },
    {
        "name": "投后巡检通知",
        "category": "消息通知",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "投后节点提醒；真 Webhook。",
        "page_kind": "notify",
        "form_headline": "投后巡检通知",
        "agent": "notify_im",
    },
    {
        "name": "监管报送",
        "category": "合规管理",
        "capability_key": "regulatory_report",
        "pages": "form+list",
        "problem": "监管报表批次校验与提交留痕。",
        "page_kind": "form_list",
        "form_headline": "监管报送",
        "agent": "regulatory_report",
    },
    {
        "name": "资管合规审查",
        "category": "合规管理",
        "capability_key": "approval_flow",
        "pages": "approval+kb",
        "default_category": "compliance",
        "kb_slug": "fund-compliance",
        "form_headline": "资管合规审查",
        "problem": "产品上架与披露合规会签。",
        "page_kind": "form_list",
        "agent": "approval_flow",
    },
    {
        "name": "基金·合规与报送库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "kb_slug": "fund-compliance",
        "form_headline": "基金·合规与报送库",
        "problem": "合规与报送口径 RAG。",
        "page_kind": "chat_kb",
        "agent": "kb_document",
    },
    {
        "name": "基金·产品披露库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "kb_slug": "fund-product",
        "form_headline": "基金·产品披露库",
        "problem": "产品说明书与披露 RAG。",
        "page_kind": "chat_kb",
        "agent": "kb_document",
    },
]

# ── 消金/金科 ──────────────────────────────────────────
_FINTECH_ROWS: list[dict[str, Any]] = [
    {
        "name": "风控预警",
        "category": "风险管理",
        "capability_key": "finance_aml",
        "pages": "form+list",
        "problem": "异常交易/欺诈预警工单；真 AML/风控单。",
        "page_kind": "form_list",
        "default_category": "risk_alert",
        "form_headline": "风控预警",
        "agent": "finance_aml",
    },
    {
        "name": "贷后管理",
        "category": "信贷业务",
        "capability_key": "credit_approval",
        "pages": "form+list",
        "problem": "贷后检查与额度调整；真授信/贷后单。",
        "page_kind": "form_list",
        "default_category": "post_loan",
        "form_headline": "贷后管理",
        "agent": "credit_approval",
    },
    {
        "name": "消金客户 KYC",
        "category": "客户管理",
        "capability_key": "finance_kyc",
        "pages": "form+list",
        "default_category": "consumer",
        "form_headline": "消金客户 KYC",
        "problem": "消金开户/授信前核验。",
        "page_kind": "form_list",
        "agent": "finance_kyc",
    },
    {
        "name": "监管报送",
        "category": "合规管理",
        "capability_key": "regulatory_report",
        "pages": "form+list",
        "form_headline": "监管报送",
        "problem": "消金监管报表批次与提交留痕。",
        "page_kind": "form_list",
        "agent": "regulatory_report",
    },
    {
        "name": "风控告警通知",
        "category": "消息通知",
        "capability_key": "notify_im",
        "pages": "notify",
        "form_headline": "风控告警通知",
        "problem": "高风险告警推送群机器人。",
        "page_kind": "notify",
        "agent": "notify_im",
    },
    {
        "name": "消金·风控合规库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "kb_slug": "fintech-compliance",
        "form_headline": "消金·风控合规库",
        "problem": "风控规则与合规口径 RAG。",
        "page_kind": "chat_kb",
        "agent": "kb_document",
    },
    {
        "name": "消金·产品与贷后库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "kb_slug": "fintech-product",
        "form_headline": "消金·产品与贷后库",
        "problem": "产品与贷后 SOP RAG。",
        "page_kind": "chat_kb",
        "agent": "kb_document",
    },
    {
        "name": "经营风险看板",
        "category": "数据分析",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "metrics_source": "finance_ops",
        "form_headline": "经营风险看板",
        "problem": "本租户金融工单真计数。",
        "page_kind": "chart",
        "agent": "chart_dashboard",
    },
]

VERTICAL_ROWS: dict[str, list[dict[str, Any]]] = {
    "bank": _BANK_ROWS,
    "securities": _SECURITIES_ROWS,
    "insurance": _INSURANCE_ROWS,
    "fund": _FUND_ROWS,
    "fintech": _FINTECH_ROWS,
}

VERTICAL_META: dict[str, dict[str, str]] = {
    "bank": {
        "name": "商业银行",
        "icon": "🏦",
        "color": "#0369a1",
        "tagline": "对公零售 · KYC · 授信 · 反洗钱",
    },
    "securities": {
        "name": "证券券商",
        "icon": "📈",
        "color": "#0e7490",
        "tagline": "适当性 · 投研尽调 · 合规 · 产品销售",
    },
    "insurance": {
        "name": "保险",
        "icon": "🛡️",
        "color": "#0284c7",
        "tagline": "核保 · 理赔 · 代理人 · 产品说明",
    },
    "fund": {
        "name": "基金资管",
        "icon": "📉",
        "color": "#1d4ed8",
        "tagline": "产品披露 · 投后 · 监管报送",
    },
    "fintech": {
        "name": "消金金科",
        "icon": "💳",
        "color": "#4338ca",
        "tagline": "风控预警 · 贷后 · 监管报送",
    },
}

FINANCE_VERTICAL_KEYS = frozenset(VERTICAL_ROWS.keys())


def scenes_by_name(pack_key: str) -> dict[str, dict[str, Any]]:
    return {r["name"]: r for r in VERTICAL_ROWS.get(pack_key, [])}


def pack_scenes(pack_key: str) -> list[dict[str, str]]:
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


def enrich_menu_plan_item(plan_item: dict[str, Any], scene_name: str, pack_key: str) -> dict[str, Any]:
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


def bank_pack_scenes() -> list[dict[str, str]]:
    return pack_scenes("bank")


def securities_pack_scenes() -> list[dict[str, str]]:
    return pack_scenes("securities")


def insurance_pack_scenes() -> list[dict[str, str]]:
    return pack_scenes("insurance")


def fund_pack_scenes() -> list[dict[str, str]]:
    return pack_scenes("fund")


def fintech_pack_scenes() -> list[dict[str, str]]:
    return pack_scenes("fintech")
