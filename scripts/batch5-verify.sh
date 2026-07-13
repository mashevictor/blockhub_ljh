#!/usr/bin/env bash
# 批次 5 · Web 真渲染率统计 + smoke-web-packages
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/shared/capability-manifest.json"
FAIL=0

echo "=============================================="
echo " BlockHub Batch 5 · Web Render Coverage"
echo "=============================================="

_ensure_manifest() {
  python3 - "$MANIFEST" <<'PY'
import json, sys
from pathlib import Path

p = Path(sys.argv[1])
if not p.is_file():
    sys.exit(2)
raw = json.loads(p.read_text(encoding="utf-8"))
caps = raw.get("capabilities") if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])
sys.exit(0 if caps else 1)
PY
}

if ! _ensure_manifest 2>/dev/null; then
  echo ">>> manifest 缺失或 capabilities 为空，尝试 codegen..."
  PY="$ROOT/backend/.venv/bin/python"
  [ -x "$PY" ] || PY=python3
  if "$PY" "$ROOT/scripts/codegen-capability-manifest.py"; then
    echo ">>> ✓ codegen 已刷新 $MANIFEST"
  else
    echo ">>> WARN: codegen 失败（需 backend venv）"
  fi
fi

python3 - "$ROOT" "$MANIFEST" <<'PY'
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
manifest_path = Path(sys.argv[2])

if not manifest_path.is_file():
    print(f"ERROR: missing {manifest_path}")
    raise SystemExit(1)

raw = json.loads(manifest_path.read_text(encoding="utf-8"))
caps = raw.get("capabilities") if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])

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
print(f"manifest: {manifest_path}")
print(f"manifest capabilities: {total}")
print(f"with physical web pkg: {with_web} ({pct}%)")
print(f"without web pkg: {len(without_web)}")
if without_web[:10]:
    print("sample missing:", ", ".join(without_web[:10]))

if total == 0:
    phys = len(list((root / "packages").glob("web-capability-*")))
    print(f"fallback physical web-capability-* dirs: {phys}")
    if phys >= 10:
        print(f"OK  physical packages {phys} (manifest empty — run codegen-capability-manifest.py)")
        raise SystemExit(0)
    raise SystemExit(1)

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
