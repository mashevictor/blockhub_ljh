#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""金融五垂直冒烟：pack 装配 · 注册表 · web 包 · KB starter · metrics。

用法（仓库根目录）:
  python scripts/smoke-finance-verticals.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.capability_registry import ALL_CAPABILITIES  # noqa: E402
from app.data.finance_vertical_capabilities import FINANCE_VERTICAL_KEYS, VERTICAL_ROWS  # noqa: E402
from app.data.industry_knowledge_bases import industry_kb_defs, starter_md_files  # noqa: E402
from app.data.industry_packs_all import ALL_INDUSTRY_KEYS, scene_count_for_pack  # noqa: E402
from app.services.scene_capability_map import assemble_industry_pack  # noqa: E402

FINANCE_KEYS = (
    "finance_kyc",
    "finance_aml",
    "credit_approval",
    "due_diligence",
    "regulatory_report",
    "insurance_case",
)


def main() -> int:
    fails: list[str] = []

    if "finance" in ALL_INDUSTRY_KEYS:
        fails.append("ALL_INDUSTRY_KEYS 仍含笼统 finance，应已替换为五垂直")
    for k in FINANCE_VERTICAL_KEYS:
        if k not in ALL_INDUSTRY_KEYS:
            fails.append(f"缺行业包 {k}")
        n = scene_count_for_pack(k)
        if n < 6:
            fails.append(f"{k} 场景过少: {n}")

    for key in FINANCE_KEYS:
        if key not in ALL_CAPABILITIES:
            fails.append(f"注册表缺 {key}")
            continue
        cap = ALL_CAPABILITIES[key]
        if not (cap.web_pkg or "").endswith("web-capability-finance"):
            fails.append(f"{key} web_pkg 非 finance 包: {cap.web_pkg}")
        if (cap.flutter_pkg or "") != "capability_finance":
            fails.append(f"{key} flutter_pkg 非 capability_finance: {cap.flutter_pkg}")

    web = ROOT / "packages" / "web-capability-finance" / "src" / "index.ts"
    if not web.is_file():
        fails.append("缺 packages/web-capability-finance")
    fl = ROOT / "packages" / "capability_finance" / "lib" / "finance_module.dart"
    if not fl.is_file():
        fails.append("缺 packages/capability_finance")
    mig = ROOT / "backend" / "alembic" / "versions" / "044_finance_ops_records.py"
    if not mig.is_file():
        fails.append("缺 alembic 044_finance_ops_records")

    for pk in sorted(FINANCE_VERTICAL_KEYS):
        defs = industry_kb_defs(pk)
        if len(defs) < 2:
            fails.append(f"{pk} KB 定义不足: {len(defs)}")
        docs: list = []
        for d in defs:
            docs.extend(starter_md_files(pk, d["slug"]))
        if len(docs) < 8:
            fails.append(f"{pk} KB starter 不足 8 篇: {len(docs)}")

        assembled = assemble_industry_pack(pk)
        keys = assembled.get("capability_keys") or []
        if not set(keys) & set(FINANCE_KEYS):
            fails.append(f"{pk} 装配未含金融 Path A keys: {keys[:12]}")
        menu = assembled.get("menu_plan") or []
        rows = VERTICAL_ROWS.get(pk) or []
        if any(r.get("metrics_source") == "finance_ops" for r in rows):
            if not any(m.get("metrics_source") == "finance_ops" for m in menu):
                fails.append(f"{pk} SSOT 有 finance_ops 但 menu_plan 未透传")

    print("=== smoke-finance-verticals ===")
    print(f"verticals: {sorted(FINANCE_VERTICAL_KEYS)}")
    for pk in sorted(FINANCE_VERTICAL_KEYS):
        print(f"  {pk}: scenes={scene_count_for_pack(pk)}")
    if fails:
        print(f"FAIL ({len(fails)}):")
        for f in fails:
            print(f"  - {f}")
        return 1
    print("OK")
    print("迁移: alembic upgrade head  # 044 finance_ops_records")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
