#!/usr/bin/env bash
# 批次 5.1 · manifest Web 包覆盖率清单（stdout + 可选 HTML）
#
# 用法:
#   bash scripts/web-coverage-report.sh
#   OUT=docs/previews/web-coverage-report.html bash scripts/web-coverage-report.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/shared/capability-manifest.json"
OUT="${OUT:-}"

if [ ! -f "$MANIFEST" ]; then
  PY="$ROOT/backend/.venv/bin/python"
  [ -x "$PY" ] || PY=python3
  "$PY" "$ROOT/scripts/codegen-capability-manifest.py"
fi

python3 - "$ROOT" "$MANIFEST" "$OUT" <<'PY'
import html
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(sys.argv[1])
manifest_path = Path(sys.argv[2])
out_path = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else ""

raw = json.loads(manifest_path.read_text(encoding="utf-8"))
caps = raw.get("capabilities") if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])

rows = []
with_web = 0
for c in caps:
    key = c.get("key", "?")
    pkg = c.get("web_pkg") or ""
    has_pkg = False
    if pkg:
        folder = root / "packages" / pkg.replace("@blockhub/", "")
        has_pkg = (folder / "src" / "index.ts").is_file()
    if has_pkg:
        with_web += 1
    rows.append((key, c.get("name", ""), c.get("widget", ""), pkg, has_pkg))

total = len(caps)
pct = round(100 * with_web / total, 1) if total else 0
print(f"Web coverage: {with_web}/{total} ({pct}%)")
print("")
print(f"{'KEY':24} {'WEB_PKG':40} OK")
print("-" * 72)
for key, _name, _w, pkg, ok in sorted(rows, key=lambda r: (not r[4], r[0])):
    mark = "✓" if ok else "·"
    print(f"{key:24} {pkg:40} {mark}")

if out_path:
    p = Path(out_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    trs = []
    for key, name, widget, pkg, ok in sorted(rows, key=lambda r: (not r[4], r[0])):
        cls = "ok" if ok else "miss"
        trs.append(
            f"<tr class='{cls}'><td>{html.escape(key)}</td>"
            f"<td>{html.escape(name)}</td><td>{html.escape(widget)}</td>"
            f"<td><code>{html.escape(pkg)}</code></td>"
            f"<td>{'✓' if ok else '—'}</td></tr>"
        )
    body = "\n".join(trs)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    p.write_text(
        f"""<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"/>
<title>Web Coverage {pct}%</title>
<style>
body{{font-family:system-ui,sans-serif;margin:24px;background:#f8fafc}}
table{{border-collapse:collapse;width:100%;background:#fff}}
th,td{{border:1px solid #e2e8f0;padding:8px 10px;text-align:left;font-size:13px}}
th{{background:#f1f5f9}} tr.miss{{background:#fff7ed}}
</style></head><body>
<h1>Web Capability Coverage</h1>
<p>{with_web}/{total} ({pct}%) · generated {ts}</p>
<table><thead><tr><th>key</th><th>name</th><th>widget</th><th>web_pkg</th><th>pkg</th></tr></thead>
<tbody>{body}</tbody></table></body></html>""",
        encoding="utf-8",
    )
    print(f"\nwrote {p}")
PY
