#!/usr/bin/env python3
"""P1-0 · Web/Flutter parity matrix report (terminal + HTML)."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATRIX_PATH = ROOT / "shared" / "flutter-parity-matrix.json"
HTML_OUT = ROOT / "docs" / "previews" / "flutter-parity-matrix.html"


def _web_pkg_ok(root: Path, web_folder: str) -> bool:
    return (root / "packages" / web_folder / "src" / "index.ts").is_file()


def _flutter_pkg_ok(root: Path, flutter_pkg: str | None) -> bool:
    if not flutter_pkg:
        return False
    pkg_dir = root / "packages" / flutter_pkg
    return (pkg_dir / "pubspec.yaml").is_file()


def _has_module(root: Path, flutter_pkg: str | None) -> bool:
    if not flutter_pkg:
        return False
    lib = root / "packages" / flutter_pkg / "lib"
    if not lib.is_dir():
        return False
    return any(p.name.endswith("_module.dart") for p in lib.glob("*_module.dart"))


def _runtime_pages(root: Path, names: list[str]) -> list[str]:
    found: list[str] = []
    pages = root / "runtime-app" / "lib" / "pages"
    for name in names:
        if (pages / name).is_file():
            found.append(name)
    return found


def _detect_status(root: Path, row: dict) -> str:
    scope = row.get("p1_scope", "app")
    flutter_pkg = row.get("flutter_pkg")
    if scope == "web_only" or not flutter_pkg:
        return "web_only"
    web_ok = _web_pkg_ok(root, row["web_folder"])
    if not web_ok:
        return "web_missing"

    pkg_ok = _flutter_pkg_ok(root, flutter_pkg)
    module_ok = _has_module(root, flutter_pkg)
    runtime = _runtime_pages(root, row.get("runtime_pages") or [])

    if runtime and not pkg_ok:
        return "runtime"
    status = "missing"
    if pkg_ok and module_ok and not runtime:
        status = "ok"
    elif pkg_ok and module_ok and runtime:
        status = "bridge"
    elif pkg_ok and not module_ok:
        status = "partial"
    if row.get("status_target") == "stub" and status == "ok":
        return "stub"
    if row.get("status_target") == "bridge" and status == "ok":
        return "bridge"
    return status


def _status_label(status: str) -> str:
    return {
        "ok": "✅ ok",
        "bridge": "🔶 bridge",
        "stub": "🔶 stub",
        "partial": "🔶 partial",
        "runtime": "❌ runtime-only",
        "missing": "❌ missing",
        "web_only": "— web-only",
        "web_missing": "❌ web-missing",
    }.get(status, status)


def build_report(root: Path) -> dict:
    matrix = json.loads(MATRIX_PATH.read_text(encoding="utf-8"))
    rows: list[dict] = []
    app_rows = [r for r in matrix["rows"] if r.get("p1_scope") == "app"]

    for row in matrix["rows"]:
        status = _detect_status(root, row)
        rows.append(
            {
                **row,
                "web_present": _web_pkg_ok(root, row["web_folder"]),
                "flutter_present": _flutter_pkg_ok(root, row.get("flutter_pkg")),
                "status": status,
            }
        )

    app_ok = sum(1 for r in rows if r.get("p1_scope") == "app" and r["status"] in ("ok", "bridge", "stub"))
    app_total = len(app_rows)
    pct = round(100 * app_ok / app_total, 1) if app_total else 0

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "app_ok": app_ok,
        "app_total": app_total,
        "app_pct": pct,
        "rows": rows,
    }


def _html(report: dict) -> str:
    trs = []
    for r in report["rows"]:
        trs.append(
            "<tr>"
            f"<td>{escape(r['web_folder'])}</td>"
            f"<td>{escape(r.get('flutter_pkg') or '—')}</td>"
            f"<td>{escape(r['status'])}</td>"
            f"<td>{'yes' if r['web_present'] else 'no'}</td>"
            f"<td>{'yes' if r['flutter_present'] else 'no'}</td>"
            f"<td>{escape(', '.join(r.get('capability_keys') or [])[:80])}</td>"
            "</tr>"
        )
    body = "\n".join(trs)
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <title>Flutter Parity Matrix</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 2rem; }}
    table {{ border-collapse: collapse; width: 100%; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
    th {{ background: #4338ca; color: #fff; }}
    .summary {{ margin-bottom: 1rem; }}
  </style>
</head>
<body>
  <h1>Flutter Parity Matrix · P1</h1>
  <p class="summary">App parity: <strong>{report['app_ok']}/{report['app_total']}</strong> ({report['app_pct']}%) · {escape(report['generated_at'])}</p>
  <table>
    <thead><tr><th>Web 包</th><th>Flutter 包</th><th>Status</th><th>Web</th><th>Flutter</th><th>Keys</th></tr></thead>
    <tbody>
{body}
    </tbody>
  </table>
</body>
</html>
"""


def main() -> int:
    root = ROOT
    if not MATRIX_PATH.is_file():
        print(f"ERROR: missing {MATRIX_PATH}", file=sys.stderr)
        return 1

    report = build_report(root)
    HTML_OUT.parent.mkdir(parents=True, exist_ok=True)
    HTML_OUT.write_text(_html(report), encoding="utf-8")

    print("==============================================")
    print(" Flutter Parity · P1")
    print("==============================================")
    print(f"{'Web 包':<32} {'Flutter 包':<28} {'Status'}")
    print("-" * 72)
    for r in report["rows"]:
        fp = r.get("flutter_pkg") or "—"
        print(f"{r['web_folder']:<32} {fp:<28} {_status_label(r['status'])}")

    print("-" * 72)
    print(f"App parity: {report['app_ok']}/{report['app_total']} ({report['app_pct']}%)")
    print(f"HTML: {HTML_OUT}")

    # P1 start baseline: ≥4/10 ok (existing packages)
    if report["app_ok"] < 4:
        print("FAIL: app_ok < 4 baseline")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
