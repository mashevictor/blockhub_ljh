#!/usr/bin/env bash
# 批次 5 · Web 真渲染率统计 + smoke-web-packages
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/shared/capability-manifest.json"
FAIL=0

echo "=============================================="
echo " BlockHub Batch 5 · Web Render Coverage"
echo "=============================================="

python3 <<PY
import json
from pathlib import Path

root = Path("$ROOT")
raw = json.loads(Path("$MANIFEST").read_text(encoding="utf-8"))
caps = raw.get("capabilities") or raw if isinstance(raw, list) else []

with_web = 0
without_web = []
for c in caps:
    pkg = c.get("web_pkg")
    if not pkg:
        without_web.append(c.get("key", "?"))
        continue
    folder = root / "packages" / pkg.replace("@blockhub/", "")
    if (folder / "src" / "index.ts").is_file():
        with_web += 1
    else:
        without_web.append(c.get("key", "?"))

total = len(caps)
pct = round(100 * with_web / total, 1) if total else 0
print(f"manifest capabilities: {total}")
print(f"with physical web pkg: {with_web} ({pct}%)")
print(f"without web pkg: {len(without_web)}")
if without_web[:10]:
    print("sample missing:", ", ".join(without_web[:10]))

# 目标 ~70%
if pct >= 50:
    print(f"OK  coverage >= 50% (target 70%)")
else:
    print(f"WARN coverage {pct}% < 50%")
    raise SystemExit(1)
PY

if [ $? -ne 0 ]; then FAIL=1; fi

echo ""
bash "$ROOT/scripts/smoke-web-packages.sh" || FAIL=1

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Batch 5 scripts OK"
else
  echo "⚠ Batch 5: see above"
fi
exit "$FAIL"
