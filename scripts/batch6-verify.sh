#!/usr/bin/env bash
# P3 批次 6 · chat SSE 压测 + 12×12 模板 UI + Melos 拆包
#
# 用法:
#   bash blockhub.sh batch6 http://101.32.209.251
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://101.32.209.251}"
FAIL=0

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
echo " BlockHub Batch 6 · P3 (D31/D32/M10)"
echo " Base: $BASE"
echo "=============================================="

step "12×12 template industry UI" bash "$ROOT/scripts/check-template-industry-ui.sh"
step "chat SSE load (10 VU)" bash "$ROOT/scripts/load-chat-sse.sh" "$BASE"

echo ""
echo ">>> [Melos packages]"
for pkg in blockhub_flutter_core capability_chat_qa capability_approval_flow capability_audit_log capability_shanghai_voice capability_kb capability_dashboard capability_data_nl_query capability_integration capability_multi_agent capability_security_mask capability_flutter_tools; do
  if [ -f "$ROOT/packages/$pkg/pubspec.yaml" ]; then
    echo "  ✓ packages/$pkg"
  else
    echo "  ✗ missing packages/$pkg"
    FAIL=$((FAIL + 1))
  fi
done

if grep -q "melos_capability_registry.g.dart" "$ROOT/runtime-app/lib/melos_capability_registry.dart" 2>/dev/null \
  && [ -f "$ROOT/runtime-app/lib/melos_capability_registry.g.dart" ]; then
  echo "  ✓ runtime-app melos registry (.dart + .g.dart)"
else
  echo "  ✗ melos registry missing — run: bash blockhub.sh flutter-dev-reset"
  FAIL=$((FAIL + 1))
fi

if command -v flutter >/dev/null 2>&1; then
  step "flutter dev reset + pub get" bash "$ROOT/scripts/flutter-dev-reset.sh"
  step "flutter analyze melos" bash -c "cd '$ROOT/runtime-app' && flutter analyze --no-fatal-infos lib/melos_capability_registry.dart lib/melos_capability_registry.g.dart lib/capability_deferred_loader.g.dart lib/pages/capability_page_registry.dart"
else
  echo ""
  echo ">>> · flutter CLI 未安装，跳过 pub get / analyze"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Batch 6 OK"
else
  echo "⚠ Batch 6: $FAIL failed"
fi
exit "$FAIL"
