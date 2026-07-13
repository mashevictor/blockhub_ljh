#!/usr/bin/env bash
# 批次 4 · Flutter 模块化 / go_router 验收
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

check() {
  if [ -f "$ROOT/$1" ]; then
    echo "  ✓ $1"
  else
    echo "  ✗ missing $1"
    FAIL=$((FAIL + 1))
  fi
}

echo "=============================================="
echo " BlockHub Batch 4 · Flutter Modular / Router"
echo "=============================================="

check "runtime-app/lib/router/capability_shell_router.dart"
check "runtime-app/lib/router/capability_routes.dart"
check "melos.yaml"

for pkg in capability_chat_qa capability_approval_flow capability_shanghai_voice capability_audit_log; do
  check "packages/$pkg/pubspec.yaml"
done

if grep -q 'createCapabilityShellRouter' "$ROOT/runtime-app/lib/app.dart" 2>/dev/null; then
  echo "  ✓ app.dart wired to go_router shell"
else
  echo "  ✗ app.dart not wired to go_router"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "可选: cd runtime-app && flutter analyze lib/app.dart lib/router/"

[ "$FAIL" -eq 0 ]
