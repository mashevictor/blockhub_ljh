#!/usr/bin/env bash
# P2 · batch9 — flutter_tools 真设备 API（13 keys）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0
TOOLS="$ROOT/packages/capability_flutter_tools"
ROUTER="$TOOLS/lib/flutter_tool_router.dart"

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
echo " BlockHub Batch 9 · flutter_tools 真设备"
echo "=============================================="

step "13 tool pages" bash -c '
  for f in scan geo camera file biometric webview notification offline signature pdf map chart; do
    test -f "'"$TOOLS"'/lib/tools/${f}_tool_page.dart" || exit 1
  done
'

step "router 13 keys" bash -c '
  for k in schedule_alarm flutter_push flutter_scan_qr flutter_geolocation flutter_camera flutter_map flutter_offline flutter_biometric flutter_signature flutter_file_picker flutter_pdf flutter_webview flutter_chart; do
    grep -q "'\''$k'\''" "'"$ROUTER"'" || exit 1
  done
'

step "device deps in pubspec" bash -c \
  "grep -q mobile_scanner '$TOOLS/pubspec.yaml' && grep -q geolocator '$TOOLS/pubspec.yaml' && grep -q fl_chart '$TOOLS/pubspec.yaml'"

step "Android permissions" bash -c \
  "grep -q POST_NOTIFICATIONS '$ROOT/runtime-app/android/app/src/main/AndroidManifest.xml' && grep -q CAMERA '$ROOT/runtime-app/android/app/src/main/AndroidManifest.xml'"

if command -v flutter >/dev/null 2>&1; then
  step "flutter dev reset + pub get" bash "$ROOT/scripts/flutter-dev-reset.sh"
  step "analyze capability_flutter_tools" bash -c \
    "cd '$TOOLS' && flutter pub get && flutter analyze --no-fatal-infos"
  step "analyze runtime registry" bash -c \
    "cd '$ROOT/runtime-app' && flutter analyze --no-fatal-infos lib/melos_capability_registry.dart lib/melos_capability_registry.g.dart"
else
  echo ""
  echo ">>> · flutter CLI 未安装，跳过 pub get / analyze"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Batch 9 OK"
else
  echo "⚠ Batch 9: $FAIL failed"
fi
exit "$FAIL"
