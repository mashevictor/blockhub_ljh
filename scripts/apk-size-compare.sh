#!/usr/bin/env bash
# P2 · 对比两种 capability_keys 组合的 pubspec 裁剪（APK 体积 proxy）
#
# Usage:
#   bash scripts/apk-size-compare.sh
#   WITH_BUILD=1 bash scripts/apk-size-compare.sh   # 实际构建并对比 MB
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$ROOT/backend/.venv/bin/python"
[ -x "$PY" ] || PY=python3
WITH_BUILD="${WITH_BUILD:-0}"

echo "=============================================="
echo " APK size compare (pubspec proxy)"
echo "=============================================="

echo ""
echo ">>> Profile A: chat_qa only"
"$PY" "$ROOT/scripts/flutter-sync-pubspec-from-manifest.py" --keys chat_qa --dry-run | grep -E "^  capability_|flutter_packages"

echo ""
echo ">>> Profile B: chat_qa + approval_flow + shanghai_voice + kb_document"
"$PY" "$ROOT/scripts/flutter-sync-pubspec-from-manifest.py" \
  --keys chat_qa,approval_flow,shanghai_voice,kb_document --dry-run | grep -E "^  capability_|flutter_packages"

if [ "$WITH_BUILD" != "1" ]; then
  echo ""
  echo ">>> WITH_BUILD=0 — 跳过 Gradle（仅 pubspec 对比）"
  echo ">>> 全量构建: WITH_BUILD=1 bash scripts/apk-size-compare.sh"
  exit 0
fi

TMP_A="/tmp/blockhub-apk-a.apk"
TMP_B="/tmp/blockhub-apk-b.apk"

echo ""
echo ">>> Building profile A..."
"$PY" "$ROOT/scripts/flutter-sync-pubspec-from-manifest.py" --keys chat_qa
CAPABILITY_KEYS=chat_qa SKIP_DEFAULT_APK=1 BUILD_PER_APP_ONLY=1 BUILD_SKIP_STOP_SERVICES=1 \
  bash "$ROOT/scripts/flutter-build-apk.sh"
cp "$ROOT/runtime-app/build/app/outputs/flutter-apk/"*.apk "$TMP_A" 2>/dev/null || true

echo ""
echo ">>> Building profile B..."
"$PY" "$ROOT/scripts/flutter-sync-pubspec-from-manifest.py" \
  --keys chat_qa,approval_flow,shanghai_voice,kb_document
CAPABILITY_KEYS=chat_qa,approval_flow,shanghai_voice,kb_document SKIP_DEFAULT_APK=1 BUILD_PER_APP_ONLY=1 BUILD_SKIP_STOP_SERVICES=1 \
  bash "$ROOT/scripts/flutter-build-apk.sh"
cp "$ROOT/runtime-app/build/app/outputs/flutter-apk/"*.apk "$TMP_B" 2>/dev/null || true

git -C "$ROOT" checkout -- runtime-app/pubspec.yaml \
  runtime-app/lib/melos_capability_registry.g.dart \
  runtime-app/lib/capability_deferred_loader.g.dart 2>/dev/null || true

echo ""
echo ">>> Results:"
[ -f "$TMP_A" ] && echo "  A (chat only):     $(wc -c < "$TMP_A") bytes"
[ -f "$TMP_B" ] && echo "  B (4 caps):        $(wc -c < "$TMP_B") bytes"
