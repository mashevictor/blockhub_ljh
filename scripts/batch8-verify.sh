#!/usr/bin/env bash
# P2 · batch8 — deferred loader + flutter_tools + pubspec sync restore
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0
PY="$ROOT/backend/.venv/bin/python"
[ -x "$PY" ] || PY=python3

step() {
  local name="$1"
  shift
  echo ""
  echo ">>> [$name]"
  if "$@"; then
    echo ">>> ✓ $name"
  else
    echo ">>> ✗ $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=============================================="
echo " BlockHub Batch 8 · P2 (deferred + tools)"
echo "=============================================="

step "flutter parity 10/10" bash "$ROOT/scripts/flutter-parity-report.sh"

step "registry codegen (chat_qa only)" \
  "$PY" "$ROOT/scripts/flutter-sync-pubspec-from-manifest.py" --keys chat_qa --dry-run

step "deferred loader present" bash -c \
  "test -f '$ROOT/runtime-app/lib/capability_deferred_loader.g.dart'"

step "flutter_tools package" bash -c \
  "test -f '$ROOT/packages/capability_flutter_tools/pubspec.yaml'"

step "build-from-publish restore trap" bash -c \
  "grep -q '_restore_build_artifacts' '$ROOT/scripts/flutter-build-from-publish.sh'"

if command -v flutter >/dev/null 2>&1; then
  step "flutter dev reset + pub get" bash "$ROOT/scripts/flutter-dev-reset.sh"
  step "flutter analyze P2" bash -c \
    "cd '$ROOT/runtime-app' && flutter analyze --no-fatal-infos lib/melos_capability_registry.dart lib/melos_capability_registry.g.dart lib/capability_deferred_loader.g.dart lib/capability_deferred_host.dart lib/pages/capability_page_registry.dart"
else
  echo ""
  echo ">>> · flutter CLI 未安装，跳过 pub get / analyze"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Batch 8 OK"
else
  echo "⚠ Batch 8: $FAIL failed"
fi
exit "$FAIL"
