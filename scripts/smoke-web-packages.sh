#!/usr/bin/env bash
# 校验 manifest 引用的 web-capability 包均有物理目录
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/shared/capability-manifest.json"
PASS=0
FAIL=0

ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
no() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "=========================================="
echo " Web Package Inventory"
echo "=========================================="

python3 - "$ROOT" "$MANIFEST" <<'PY'
import json, sys
from pathlib import Path

root = Path(sys.argv[1])
manifest_path = Path(sys.argv[2])
raw = json.loads(manifest_path.read_text(encoding="utf-8"))
caps = raw.get("capabilities") if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])
pkgs = sorted({c.get("web_pkg") for c in caps if c.get("web_pkg")})

missing = []
for pkg in pkgs:
    folder = root / "packages" / pkg.replace("@blockhub/", "")
    index = folder / "src" / "index.ts"
    if index.is_file():
        print(f"OK  {pkg}")
    else:
        print(f"MISS {pkg}")
        missing.append(pkg)

# glob 发现的物理包
discovered = sorted(p.name for p in (root / "packages").glob("web-capability-*") if p.is_dir())
print("")
print(f"manifest refs: {len(pkgs)}  physical: {len(discovered)}")

if missing:
    sys.exit(1)
PY

if [ $? -eq 0 ]; then
  ok "all manifest web_pkgs have physical packages"
else
  no "missing web-capability packages"
fi

# 统计
PHYS=$(find "$ROOT/packages" -maxdepth 1 -type d -name 'web-capability-*' | wc -l | tr -d ' ')
ok "physical packages: $PHYS"

echo "=========================================="
echo " Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
echo "=========================================="
