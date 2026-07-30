#!/usr/bin/env python3
"""Generate industry.gen.json + scene.gen.json from industry_packs_all SSOT.

Keys:
  industry.{pack}.name / .tagline
  scene.{pack}.{idx:03d}.name / .problem / .category

EN: pack labels hand-mapped; categories via seed/category.en-US.json;
scene names via seed/scene.en-US.json then glossary phrase map; parity fallback = zh.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.industry_packs_all import ALL_INDUSTRY_PACKS  # noqa: E402

MESSAGES = ROOT / "shared" / "i18n" / "messages"
SEED = ROOT / "shared" / "i18n" / "seed"
GEN_HEADER = {
    "_generated_by": "scripts/codegen-industry-scene-i18n.py",
    "_do_not_edit": True,
}

PACK_EN: dict[str, tuple[str, str]] = {
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

# High-traffic office scene EN (name → EN). Problems use name-based fallback if missing.
OFFICE_SCENE_EN: dict[str, str] = {
    "制度政策问答": "Policy Q&A",
    "请假申请": "Leave request",
    "加班申请": "Overtime request",
    "出差申请": "Travel request",
    "报销审批": "Expense claim",
    "入职办理": "Onboarding",
    "离职交接": "Offboarding handover",
    "考勤异常": "Attendance exception",
    "会议室预约": "Meeting room booking",
    "用章申请": "Seal request",
    "名片申请": "Business card request",
    "福利申领": "Benefits claim",
    "付款申请": "Payment request",
    "采购申请": "Purchase request",
    "合同审批": "Contract approval",
    "预算追加": "Budget top-up",
    "开票申请": "Invoice request",
    "收款确认": "Payment confirmation",
    "法务咨询": "Legal consult",
    "制度文档库": "Policy document library",
    "会议纪要": "Meeting minutes",
    "知识问答": "Knowledge Q&A",
    "文档协作": "Document collab",
    "培训资料": "Training materials",
    "FAQ 知识库": "FAQ knowledge base",
    "通用审批": "General approval",
    "请示报告": "Request for instruction",
    "用印流程": "Seal workflow",
    "跨部门会签": "Cross-dept countersign",
    "变更申请": "Change request",
    "经营看板": "Ops dashboard",
    "人事报表": "HR reports",
    "费用分析": "Expense analytics",
    "自然语言查数": "Natural-language query",
    "导出报表": "Export reports",
    "审批提醒": "Approval reminders",
    "公告通知": "Announcements",
    "待办推送": "Todo push",
    "邮件通知": "Email notify",
    "企微/钉钉推送": "WeCom / DingTalk push",
    "IT 报修": "IT repair ticket",
    "账号权限": "Account permissions",
    "资产领用": "Asset checkout",
    "软件安装": "Software install",
    "网络安全": "Network security",
    "访客登记": "Visitor registration",
    "ERP 对接": "ERP connector",
    "OA 同步": "OA sync",
    "单点登录": "SSO",
    "开放 API": "Open API",
    "Webhook": "Webhook",
}

# Longest-first phrase glossary for remaining scene names / problems.
GLOSSARY: list[tuple[str, str]] = [
    ("自然语言查数", "NL data query"),
    ("制度政策问答", "policy Q&A"),
    ("跨部门会签", "cross-dept countersign"),
    ("企微/钉钉推送", "WeCom/DingTalk push"),
    ("会议室预约", "meeting room booking"),
    ("知识库", "knowledge base"),
    ("审批", "approval"),
    ("请假", "leave"),
    ("加班", "overtime"),
    ("出差", "travel"),
    ("报销", "expense"),
    ("入职", "onboarding"),
    ("离职", "offboarding"),
    ("考勤", "attendance"),
    ("用章", "seal"),
    ("用印", "seal"),
    ("名片", "business card"),
    ("福利", "benefits"),
    ("付款", "payment"),
    ("采购", "purchase"),
    ("合同", "contract"),
    ("预算", "budget"),
    ("开票", "invoicing"),
    ("收款", "collections"),
    ("法务", "legal"),
    ("制度", "policy"),
    ("会议", "meeting"),
    ("培训", "training"),
    ("报表", "report"),
    ("看板", "dashboard"),
    ("公告", "announcement"),
    ("通知", "notification"),
    ("待办", "todo"),
    ("邮件", "email"),
    ("报修", "repair ticket"),
    ("权限", "permissions"),
    ("资产", "assets"),
    ("访客", "visitor"),
    ("对接", "integration"),
    ("同步", "sync"),
    ("申请", "request"),
    ("办理", "processing"),
    ("交接", "handover"),
    ("异常", "exception"),
    ("预约", "booking"),
    ("确认", "confirmation"),
    ("咨询", "consult"),
    ("文档", "document"),
    ("协作", "collab"),
    ("资料", "materials"),
    ("通用", "general"),
    ("请示", "escalation"),
    ("报告", "report"),
    ("流程", "workflow"),
    ("变更", "change"),
    ("经营", "operations"),
    ("人事", "HR"),
    ("费用", "expense"),
    ("分析", "analytics"),
    ("导出", "export"),
    ("提醒", "reminder"),
    ("推送", "push"),
    ("账号", "account"),
    ("领用", "checkout"),
    ("软件", "software"),
    ("安装", "install"),
    ("网络", "network"),
    ("安全", "security"),
    ("登记", "registration"),
    ("开放", "open"),
    ("线索", "lead"),
    ("报价", "quote"),
    ("漏斗", "funnel"),
    ("客户", "customer"),
    ("会员", "member"),
    ("库存", "inventory"),
    ("订单", "order"),
    ("运单", "shipment"),
    ("仓储", "warehouse"),
    ("调度", "dispatch"),
    ("签收", "POD"),
    ("排班", "scheduling"),
    ("导诊", "triage"),
    ("质检", "QC"),
    ("巡检", "inspection"),
    ("工单", "work order"),
    ("理赔", "claims"),
    ("核保", "underwriting"),
    ("招聘", "recruiting"),
    ("绩效", "performance"),
    ("薪酬", "payroll"),
    ("活动", "campaign"),
    ("内容", "content"),
    ("审核", "review"),
    ("版权", "copyright"),
    ("分发", "distribution"),
    ("试驾", "test drive"),
    ("售后", "aftersales"),
    ("配件", "parts"),
    ("进度", "progress"),
    ("材料", "materials"),
    ("验收", "acceptance"),
    ("溯源", "traceability"),
    ("补贴", "subsidy"),
    ("产销", "sales"),
    ("选题", "topic planning"),
    ("管理", "mgmt"),
    ("服务", "service"),
    ("查询", "query"),
    ("跟踪", "tracking"),
    ("预警", "alert"),
    ("监控", "monitoring"),
    ("配置", "config"),
    ("智能", "smart"),
    ("在线", "online"),
    ("标准", "standard"),
    ("场景", "scene"),
]


def _load_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def glossary_en(text: str) -> str:
    if not text:
        return text
    # Prefer exact office map
    if text in OFFICE_SCENE_EN:
        return OFFICE_SCENE_EN[text]
    remaining = text
    parts: list[str] = []
    while remaining:
        hit = None
        for zh, en in GLOSSARY:
            if remaining.startswith(zh):
                hit = (zh, en)
                break
        if hit:
            parts.append(hit[1])
            remaining = remaining[len(hit[0]) :]
            continue
        # skip punctuation / digits as-is
        m = re.match(r"^[\dA-Za-z+/·\-\s]+", remaining)
        if m:
            parts.append(m.group(0).strip())
            remaining = remaining[m.end() :]
            continue
        # unknown CJK char — keep and advance one
        parts.append(remaining[0])
        remaining = remaining[1:]
    out = " ".join(p for p in parts if p).strip()
    out = re.sub(r"\s+", " ", out)
    # Partial glossary leaves spaced CJK + Latin ("统 防 统 治 dispatch") — refuse mixed junk.
    # Keep original zh so runtime can fall back cleanly; prefer seed/scene.en-US.json overrides.
    if re.search(r"[\u4e00-\u9fff]", out):
        return text
    return out[:1].upper() + out[1:] if out else text


def _write(locale: str, stem: str, payload: dict[str, str]) -> None:
    path = MESSAGES / locale / f"{stem}.gen.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    body = {**GEN_HEADER, **dict(sorted(payload.items()))}
    path.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK  {path.relative_to(ROOT)} ({len(payload)} keys)")


def main() -> None:
    cat_en = {
        k: v
        for k, v in _load_json(SEED / "category.en-US.json").items()
        if not str(k).startswith("_") and isinstance(v, str)
    }
    scene_seed = {
        k: v
        for k, v in _load_json(SEED / "scene.en-US.json").items()
        if not str(k).startswith("_") and isinstance(v, str)
    }

    ind_zh: dict[str, str] = {}
    ind_en: dict[str, str] = {}
    sc_zh: dict[str, str] = {}
    sc_en: dict[str, str] = {}

    for pack in ALL_INDUSTRY_PACKS:
        key = pack["key"]
        zh_name = pack["name"]
        zh_tag = pack.get("tagline") or ""
        ind_zh[f"industry.{key}.name"] = zh_name
        ind_zh[f"industry.{key}.tagline"] = zh_tag
        en_name, en_tag = PACK_EN.get(key, (glossary_en(zh_name), glossary_en(zh_tag)))
        ind_en[f"industry.{key}.name"] = en_name
        ind_en[f"industry.{key}.tagline"] = en_tag or glossary_en(zh_tag)

        for i, scene in enumerate(pack.get("scenes") or [], start=1):
            idx = f"{i:03d}"
            nkey = f"scene.{key}.{idx}.name"
            pkey = f"scene.{key}.{idx}.problem"
            ckey = f"scene.{key}.{idx}.category"
            name = scene.get("name") or f"{key}-{idx}"
            problem = scene.get("problem") or name
            category = scene.get("category") or ""
            sc_zh[nkey] = name
            sc_zh[pkey] = problem
            sc_zh[ckey] = category

            sc_en[nkey] = scene_seed.get(nkey) or OFFICE_SCENE_EN.get(name) or glossary_en(name)
            sc_en[pkey] = scene_seed.get(pkey) or glossary_en(problem)
            sc_en[ckey] = scene_seed.get(ckey) or cat_en.get(category) or glossary_en(category) or category

    # parity
    for k, v in ind_zh.items():
        ind_en.setdefault(k, v)
    for k, v in sc_zh.items():
        sc_en.setdefault(k, v)

    _write("zh-CN", "industry", ind_zh)
    _write("en-US", "industry", ind_en)
    _write("zh-CN", "scene", sc_zh)
    _write("en-US", "scene", sc_en)


if __name__ == "__main__":
    main()
