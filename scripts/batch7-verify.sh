#!/usr/bin/env bash
# P1 · batch7 — Flutter parity + pubspec sync + analyze
#
# Usage:
#   bash blockhub.sh batch7
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
echo " BlockHub Batch 7 · P1 Flutter Parity"
echo "=============================================="

step "flutter parity report" bash "$ROOT/scripts/flutter-parity-report.sh"

step "pubspec sync dry-run (chat_qa only)" \
  "$PY" "$ROOT/scripts/flutter-sync-pubspec-from-manifest.py" --keys chat_qa --dry-run

step "pubspec sync dry-run (chat_qa+approval_flow)" \
  "$PY" "$ROOT/scripts/flutter-sync-pubspec-from-manifest.py" --keys chat_qa,approval_flow --dry-run

if command -v flutter >/dev/null 2>&1; then
  step "flutter pub get" bash -c "cd '$ROOT/runtime-app' && flutter pub get"
  step "flutter analyze registry" bash -c \
    "cd '$ROOT/runtime-app' && flutter analyze --no-fatal-infos lib/melos_capability_registry.dart lib/pages/capability_page_registry.dart"
else
  echo ""
  echo ">>> · flutter CLI 未安装，跳过 pub get / analyze"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Batch 7 OK (P1 infrastructure)"
else
  echo "⚠ Batch 7: $FAIL failed"
fi
exit "$FAIL"
