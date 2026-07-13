#!/usr/bin/env python3
"""D31 · 12 schema 模板 × 12 行业 UI 自动化检查."""

from __future__ import annotations

import html
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.schema_templates import SCENARIO_TEMPLATES  # noqa: E402
from app.data.capability_registry import ALL_CAPABILITIES  # noqa: E402
from app.services import effective_capability_registry as _eff  # noqa: F401, E402
from app.services.schema_generator import generate_page_schema  # noqa: E402
from app.services.build_manifest import build_manifest  # noqa: E402

# 12 精选行业（与 Home 行业站点对齐）
INDUSTRIES = [
    "office", "mfg", "sales", "med", "game", "retail",
    "edu", "finance", "logistics", "realestate", "hotel", "energy",
]

HOME_KINDS = [
    "approval", "chat_kb", "dashboard", "form", "list",
    "funnel", "kb", "notify", "integration", "mobile_field",
]


def web_pkg_path(web_pkg: str) -> Path:
    return ROOT / "packages" / web_pkg.replace("@blockhub/", "") / "src" / "index.ts"


def check_cell(tpl: dict, industry: str) -> dict:
    tpl_id = tpl["id"]
    scenario = tpl["match"][0]
    keys = list(tpl["capability_keys"])
    schema = generate_page_schema(
        app_id="check001",
        app_name=f"{tpl['name']}-{industry}",
        capability_keys=keys,
    )
    manifest = build_manifest(capability_keys=keys)
    menu_keys = {m["key"] for m in schema.get("menu") or []}
    root_children = schema.get("root", {}).get("children") or []
    issues: list[str] = []

    if len(menu_keys) != len(keys):
        issues.append("menu mismatch")
    if len(root_children) != len(keys):
        issues.append("root children mismatch")
    for k in keys:
        if k not in ALL_CAPABILITIES:
            issues.append(f"unknown cap:{k}")
    for pkg in manifest.get("web_pkgs") or []:
        if not web_pkg_path(pkg).is_file():
            issues.append(f"missing web:{pkg}")

    ok = not issues
    return {
        "template_id": tpl_id,
        "template_name": tpl["name"],
        "industry": industry,
        "native_industry": tpl.get("industry", "office"),
        "scenario": scenario,
        "capability_keys": keys,
        "web_pkgs": manifest.get("web_pkgs") or [],
        "menu_count": len(menu_keys),
        "ok": ok,
        "issues": issues,
    }


def main() -> int:
    out_html = ROOT / "docs" / "previews" / "template-industry-ui-check.html"
    if len(sys.argv) > 1:
        out_html = Path(sys.argv[1])

    rows = []
    fail = 0
    for tpl in SCENARIO_TEMPLATES:
        for ind in INDUSTRIES:
            cell = check_cell(tpl, ind)
            rows.append(cell)
            if not cell["ok"]:
                fail += 1

    tpl_count = len(SCENARIO_TEMPLATES)
    ind_count = len(INDUSTRIES)
    total = len(rows)
    pass_count = sum(1 for r in rows if r["ok"])

    print("==============================================")
    print(f" Template × Industry UI Check")
    print(f" {tpl_count} templates × {ind_count} industries = {total} cells")
    print(f" passed: {pass_count}/{total}")
    print("==============================================")

    for r in rows:
        mark = "OK" if r["ok"] else "FAIL"
        print(f"  {mark}  {r['template_id']:22} × {r['industry']:12}  keys={len(r['capability_keys'])}")
        if r["issues"]:
            print(f"        · {', '.join(r['issues'])}")

    # Home 10 UI kinds
    home_ts = ROOT / "home" / "src" / "data" / "industryPageTemplates.ts"
    home_ok = home_ts.is_file()
    if home_ok:
        text = home_ts.read_text(encoding="utf-8")
        missing_kinds = [k for k in HOME_KINDS if k not in text]
        if missing_kinds:
            home_ok = False
            print(f"  FAIL Home industryPageTemplates missing kinds: {missing_kinds}")
        else:
            print(f"  OK   Home industryPageTemplates 10 kinds present")
    else:
        print("  FAIL missing home industryPageTemplates.ts")
        fail += 1

    trs = []
    for r in rows:
        cls = "ok" if r["ok"] else "fail"
        iss = ", ".join(r["issues"]) if r["issues"] else "—"
        trs.append(
            f"<tr class='{cls}'><td>{html.escape(r['template_id'])}</td>"
            f"<td>{html.escape(r['template_name'])}</td>"
            f"<td>{html.escape(r['industry'])}</td>"
            f"<td>{len(r['capability_keys'])}</td>"
            f"<td>{len(r['web_pkgs'])}</td>"
            f"<td>{'✓' if r['ok'] else '✗'}</td>"
            f"<td>{html.escape(iss)}</td></tr>"
        )
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    pct = round(100 * pass_count / total, 1) if total else 0
    out_html.parent.mkdir(parents=True, exist_ok=True)
    out_html.write_text(
        f"""<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"/>
<title>12×12 Template UI Check {pct}%</title>
<style>
body{{font-family:system-ui,sans-serif;margin:20px;background:#f8fafc}}
table{{border-collapse:collapse;width:100%;background:#fff;font-size:12px}}
th,td{{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}}
th{{background:#f1f5f9}} tr.fail{{background:#fff7ed}}
</style></head><body>
<h1>12 Templates × 12 Industries</h1>
<p>{pass_count}/{total} ({pct}%) · Home kinds: {'OK' if home_ok else 'FAIL'} · {ts}</p>
<table><thead><tr><th>template</th><th>name</th><th>industry</th><th>caps</th><th>web_pkgs</th><th>ok</th><th>issues</th></tr></thead>
<tbody>{''.join(trs)}</tbody></table></body></html>""",
        encoding="utf-8",
    )
    print(f"\nwrote {out_html}")

    if fail > 0 or not home_ok:
        print(f"\n⚠ {fail} cell(s) failed")
        return 1
    print("\n✅ all template×industry checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
