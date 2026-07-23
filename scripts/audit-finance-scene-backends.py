#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""审计金融五垂直场景挂载能力的真后端覆盖。"""

from __future__ import annotations

import ast
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.capability_registry import ALL_CAPABILITIES  # noqa: E402
from app.data.finance_vertical_capabilities import VERTICAL_ROWS  # noqa: E402

# 金融场景禁止挂假壳能力
FORBIDDEN_IN_FINANCE = frozenset(
    {
        # EmailWidget 曾为示意页；金融场景应走 notify_im。邮件能力已转真通知表，但仍不推荐作金融主路径。
    }
)

# 已知「真表 + /api/v1」映射（路径 A）
REAL_BACKEND: dict[str, str] = {
    "finance_kyc": "finance_ops_records + /finance-ops",
    "finance_aml": "finance_ops_records + /finance-ops",
    "credit_approval": "finance_ops_records + /finance-ops",
    "due_diligence": "finance_ops_records + /finance-ops",
    "regulatory_report": "finance_ops_records + /finance-ops",
    "insurance_case": "finance_ops_records + /finance-ops",
    "finance_news": "finance_news_items + /finance-news",
    "kb_document": "kb docs + /kb",
    "chat_qa": "chat/kb + /chat|/kb",
    "policy_qa": "policy_qa + /policy-qa",
    "approval_flow": "approvals + /approvals",
    "approval_inbox": "approvals + /approvals",
    "seal_request": "approvals + /approvals (FormWidget)",
    "legal_case": "legal_case + /legal-case",
    "notify_im": "notifications/integration + /notifications|/integration",
    "notify_email": "notifications + /notifications/email",
    "notify_inapp": "notifications + /notifications",
    "chart_dashboard": "finance-ops/stats or /stats|/kb/stats",
    "ops_kpi": "ops_kpi_records + /ops-kpi",
    "data_nl_query": "reports/nl-query (finance_ops+sales 真聚合)",
    "expense_claim": "expense_claim + /expense-claim",
    "leave_request": "leave_request + /leave-request",
    "it_ticket": "it_ticket_records + /it-ticket",
    "asset_manage": "asset_manage_records + /asset-manage",
    "campaign_ops": "campaign_ops + /campaign-ops",
    "meeting_booking": "meeting_booking + /meeting-booking",
    "hire_onboard": "hire_onboard + /hire-onboard",
}

# API 路由文件存在性辅助
API_HINTS = {
    "finance_ops": "finance_ops.py",
    "finance_news": "finance_news.py",
    "kb": "kb.py",
    "chat": "chat.py",
    "approvals": "approvals.py",
    "legal_case": "legal_case.py",
    "notifications": "notifications.py",
    "ops_kpi": "ops_kpi.py",
    "expense_claim": "expense_claim.py",
    "it_ticket": "it_ticket.py",
    "asset_manage": "asset_manage.py",
    "campaign_ops": "campaign_ops.py",
    "policy_qa": "policy_qa.py",
    "reports": "reports.py",
}


def web_uses_api(pkg_folder: str) -> tuple[bool, str]:
    src = ROOT / "packages" / pkg_folder / "src"
    if not src.exists():
        # built-in widgets in web-core / approval
        return False, "no package folder"
    hits: list[str] = []
    for p in src.rglob("*.tsx"):
        t = p.read_text(encoding="utf-8", errors="ignore")
        if "apiFetch" in t or "getRuntimeAuthedDio" in t or "/api/v1/" in t:
            hits.append(p.name)
        if "localStorage" in t and ("setItem" in t or "getItem" in t):
            # flag potential fake
            if "mock" in t.lower() or "假" in t:
                return False, f"localStorage mock in {p.name}"
    if hits:
        return True, ",".join(hits[:4])
    return False, "no apiFetch"


def main() -> int:
    c: Counter[str] = Counter()
    for rows in VERTICAL_ROWS.values():
        for r in rows:
            c[r["capability_key"]] += 1

    api_dir = ROOT / "backend" / "app" / "api" / "v1"
    fails: list[str] = []
    print("=== finance scene capability real-backend audit ===")
    for key, n in sorted(c.items(), key=lambda x: (-x[1], x[0])):
        if key in FORBIDDEN_IN_FINANCE:
            fails.append(f"{key}: forbidden in finance SSOT")
        cap = ALL_CAPABILITIES.get(key)
        backend = REAL_BACKEND.get(key)
        status = "OK" if backend else "GAP"
        web_pkg = (cap.web_pkg if cap else "") or ""
        folder = web_pkg.replace("@blockhub/", "") if web_pkg.startswith("@blockhub/") else ""
        api_ok = ""
        if folder:
            ok, detail = web_uses_api(folder)
            api_ok = f" web={detail}" if ok else f" WEB_WEAK={detail}"
            if not ok and backend:
                fails.append(f"{key}: package {folder} weak API use ({detail})")
        if not backend:
            fails.append(f"{key}: no REAL_BACKEND mapping")
            status = "GAP"
        print(f"[{status}] x{n:2} {key:22} {backend or '???'}{api_ok}")

    # spot-check core APIs exist
    for name in ("finance_ops.py", "finance_news.py", "approvals.py", "kb.py", "it_ticket.py", "asset_manage.py", "campaign_ops.py", "ops_kpi.py", "expense_claim.py", "policy_qa.py"):
        if not (api_dir / name).is_file():
            fails.append(f"missing API file {name}")

    print("---")
    if fails:
        print(f"FAIL {len(fails)}")
        for f in fails:
            print(" -", f)
        return 1
    print("OK all scene keys mapped to real backends")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
