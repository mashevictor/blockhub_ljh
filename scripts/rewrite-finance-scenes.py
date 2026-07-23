#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""清洗 DeepSeek enrichment 并重写 finance_vertical_capabilities.py 的五垂直 ROWS。"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.finance_vertical_capabilities import VERTICAL_META, VERTICAL_ROWS  # noqa: E402

ENRICH = ROOT / "backend" / "app" / "data" / "_finance_scene_enrichment.json"
TARGET = ROOT / "backend" / "app" / "data" / "finance_vertical_capabilities.py"

SKIP = {
    "bank": {"对公客户开户尽调", "同业市场新闻推送"},
    "securities": set(),
    "insurance": set(),
    "fund": {"监管报表生成"},
    "fintech": {"监管报表生成", "授信额度审批"},
}

CAT_SLUG = {
    "信用卡调额": "card_limit",
    "普惠小微尽调": "msme_dd",
    "对公绩效考核": "corp_kpi",
    "零售合规审查": "retail_compliance",
    "同业授信管理": "interbank_limit",
    "运营差错处理": "ops_error",
    "贷后催收分配": "collection",
    "审计调阅管理": "audit_access",
    "客服投诉处理": "cs_complaint",
    "信用卡反欺诈": "card_fraud",
    "对公开户KYC": "corporate",
    "零售客户分析": "retail_churn",
    "普惠贷款审批": "msme_loan",
    "运营数据查询": "ops_nl",
    "两融业务": "margin",
    "经纪业务": "brokerage",
    "投行管理": "ib_proj",
    "财富管理": "wealth",
    "风险管理": "risk",
    "研究管理": "research",
    "清算运营": "clearing",
    "客户服务": "cs",
    "经纪管理": "broker_kpi",
    "投行合规": "ib_compliance",
    "研究支持": "research_qa",
    "保全变更": "policy_change",
    "续期催缴": "renewal",
    "健康险核保": "health_uw",
    "车险理赔": "claim_auto",
    "再保结算": "reinsurance",
    "精算变更": "actuarial",
    "客服转办": "cs_ticket",
    "佣金结算": "commission",
    "团险续保": "group_renew",
    "保全合规": "policy_compliance",
    "续期看板": "renewal_kpi",
    "车险费率": "auto_rate",
    "再保报告": "re_report",
    "精算看板": "actuarial_kpi",
    "客服质检": "cs_qa",
    "基金募集": "fundraising",
    "交易对手管理": "counterparty",
    "投研分析": "research_pos",
    "合规咨询": "compliance_qa",
    "投资者服务": "investor",
    "反洗钱": "aml",
    "估值监控": "nav_alert",
    "财务管理": "expense",
    "监管报送": "report",
    "印章管理": "seal",
    "运营管理": "ops_kpi",
    "尽职调查": "dd",
    "投研知识库": "research_kb",
    "营销活动": "campaign",
}


def fix_pages(key: str) -> tuple[str, str]:
    if key == "finance_news":
        return "list", "list"
    if key in ("chart_dashboard", "ops_kpi"):
        return "chart", "chart"
    if key in ("notify_im", "notify_email", "notify_inapp"):
        return "notify", "notify"
    if key in ("kb_document", "chat_qa", "policy_qa", "data_nl_query"):
        return "kb+chat", "chat_kb"
    if key in ("approval_flow", "approval_inbox", "seal_request"):
        return "approval+kb", "form_list"
    return "form+list", "form_list"


def sanitize(row: dict, vertical: str) -> dict | None:
    name = str(row.get("name") or "").strip()
    if not name or name in SKIP.get(vertical, set()):
        return None
    key = str(row.get("capability_key") or "").strip()
    if not key:
        return None
    pages, page_kind = fix_pages(key)
    problem = str(row.get("problem") or "").strip()
    if len(problem) > 72:
        problem = problem[:69] + "…"
    out: dict = {
        "name": name,
        "category": str(row.get("category") or "业务运营").strip()[:16],
        "capability_key": key,
        "pages": pages,
        "problem": problem,
        "page_kind": page_kind,
        "form_headline": str(row.get("form_headline") or name).strip()[:36],
        "agent": key,
    }
    dc = str(row.get("default_category") or "").strip()
    if dc:
        slug = CAT_SLUG.get(dc)
        if not slug:
            slug = re.sub(r"[^a-zA-Z0-9_]+", "_", dc).strip("_").lower()[:28] or "general"
        out["default_category"] = slug
    if row.get("kb_slug"):
        out["kb_slug"] = str(row["kb_slug"])
    if key == "finance_news":
        out["vertical"] = vertical
    if key in ("chart_dashboard", "ops_kpi"):
        out["metrics_source"] = "finance_ops"
    return out


def emit_rows(var: str, rows: list[dict]) -> str:
    lines = [f"{var}: list[dict[str, Any]] = ["]
    for r in rows:
        lines.append("    {")
        for k, v in r.items():
            lines.append(f'        "{k}": {json.dumps(v, ensure_ascii=False)},')
        lines.append("    },")
    lines.append("]")
    return "\n".join(lines)


def main() -> int:
    enrich = json.loads(ENRICH.read_text(encoding="utf-8"))
    merged: dict[str, list[dict]] = {}
    for vertical in ("bank", "securities", "insurance", "fund", "fintech"):
        base = list(VERTICAL_ROWS[vertical])
        seen = {r["name"] for r in base}
        added = 0
        for raw in enrich.get(vertical) or []:
            row = sanitize(raw, vertical)
            if not row or row["name"] in seen:
                continue
            seen.add(row["name"])
            base.append(row)
            added += 1
        merged[vertical] = base
        print(f"{vertical}: {len(VERTICAL_ROWS[vertical])} +{added} -> {len(base)}")

    meta = {
        "bank": {**VERTICAL_META["bank"], "tagline": "对公零售 · 信贷合规 · 新闻 Agent · 全链路"},
        "securities": {**VERTICAL_META["securities"], "tagline": "经纪两融 · 投行财富 · 新闻 Agent · 全链路"},
        "insurance": {**VERTICAL_META["insurance"], "tagline": "核保理赔 · 保全续期 · 新闻 Agent · 全链路"},
        "fund": {**VERTICAL_META["fund"], "tagline": "募集交易 · 投研估值 · 新闻 Agent · 全链路"},
        "fintech": {**VERTICAL_META["fintech"], "tagline": "获客授信 · 风控催收 · 新闻 Agent · 全链路"},
    }

    header = dedent(
        '''\
        # -*- coding: utf-8 -*-
        """金融五垂直行业场景 → 正式 capability 映射（SSOT）。

        垂直包：bank / securities / insurance / fund / fintech
        共享 Path A：finance_kyc / finance_aml / credit_approval / due_diligence /
        regulatory_report / insurance_case / finance_news；复用 kb / approval / legal_case /
        notify_* / chat / chart / ops_kpi / policy_qa / data_nl_query 等已注册能力。
        禁止假 seed；空库空列表。finance_news 演示样本须显式写入（source=demo）。
        场景库经 DeepSeek 扩充；仅映射已有 capability_key，不发明未注册能力。
        """

        from __future__ import annotations

        from typing import Any

        '''
    )

    parts = [header]
    parts.append("# ── 银行 ──────────────────────────────────────────────")
    parts.append(emit_rows("_BANK_ROWS", merged["bank"]))
    parts.append("")
    parts.append("# ── 券商 ──────────────────────────────────────────────")
    parts.append(emit_rows("_SECURITIES_ROWS", merged["securities"]))
    parts.append("")
    parts.append("# ── 保险 ──────────────────────────────────────────────")
    parts.append(emit_rows("_INSURANCE_ROWS", merged["insurance"]))
    parts.append("")
    parts.append("# ── 基金/资管 ──────────────────────────────────────────")
    parts.append(emit_rows("_FUND_ROWS", merged["fund"]))
    parts.append("")
    parts.append("# ── 消金/金科 ──────────────────────────────────────────")
    parts.append(emit_rows("_FINTECH_ROWS", merged["fintech"]))
    parts.append("")
    parts.append("VERTICAL_ROWS: dict[str, list[dict[str, Any]]] = {")
    parts.append('    "bank": _BANK_ROWS,')
    parts.append('    "securities": _SECURITIES_ROWS,')
    parts.append('    "insurance": _INSURANCE_ROWS,')
    parts.append('    "fund": _FUND_ROWS,')
    parts.append('    "fintech": _FINTECH_ROWS,')
    parts.append("}")
    parts.append("")
    parts.append("VERTICAL_META: dict[str, dict[str, str]] = " + json.dumps(meta, ensure_ascii=False, indent=4))
    parts.append("")
    parts.append(
        dedent(
            '''\
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
                for k in ("default_category", "form_headline", "page_kind", "metrics_source", "vertical"):
                    if row.get(k) is not None:
                        plan_item[k] = row[k]
                if row.get("capability_key") == "finance_news" and not plan_item.get("vertical"):
                    plan_item["vertical"] = pack_key
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
            '''
        )
    )

    TARGET.write_text("\n".join(parts).rstrip() + "\n", encoding="utf-8")
    print(f"wrote {TARGET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
