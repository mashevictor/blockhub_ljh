#!/usr/bin/env bash
# APK 验收：本地产物 + runtime 下载接口
#
# 用法:
#   bash scripts/smoke-apk.sh                          # 检查 default.apk + 下载 API
#   bash scripts/smoke-apk.sh http://101.32.209.251
#   WITH_BUILD=1 bash scripts/smoke-apk.sh             # 无 APK 时尝试构建（需 Flutter/Android SDK）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://101.32.209.251}"
API="$BASE/api/v1"
APK_DIR="$ROOT/backend/uploads/apks"
DEFAULT_APK="$APK_DIR/default.apk"
PASS=0
FAIL=0

ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
no() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "=========================================="
echo " APK Smoke · $BASE"
echo "=========================================="

if [ ! -f "$DEFAULT_APK" ]; then
  if [ "${WITH_BUILD:-0}" = "1" ] && command -v flutter >/dev/null 2>&1; then
    echo ">>> default.apk 缺失，尝试构建..."
    bash "$ROOT/scripts/flutter-build-apk.sh"
  else
    no "default.apk 不存在 ($DEFAULT_APK)"
    echo ""
    echo "  构建命令:"
    echo "    sudo bash scripts/setup-flutter-android.sh   # 首次"
    echo "    bash scripts/flutter-build-apk.sh"
    echo "  或: WITH_BUILD=1 bash scripts/smoke-apk.sh"
    echo "=========================================="
    exit 1
  fi
fi

if [ -f "$DEFAULT_APK" ]; then
  SIZE=$(wc -c < "$DEFAULT_APK" | tr -d ' ')
  if [ "$SIZE" -gt 500000 ] 2>/dev/null; then
    ok "default.apk exists ($(numfmt --to=iec-i --suffix=B "$SIZE" 2>/dev/null || echo "${SIZE} bytes"))"
  else
    no "default.apk too small ($SIZE bytes)"
  fi
else
  no "default.apk still missing after build attempt"
fi

# 上海话 APK（可选）
if [ -f "$APK_DIR/shanghai-voice.apk" ]; then
  ok "shanghai-voice.apk present"
else
  echo "  · shanghai-voice.apk optional (bash scripts/build-shanghai-voice-apk.sh)"
fi

if command -v aapt >/dev/null 2>&1 || ls "${ANDROID_HOME:-}/build-tools/"*/aapt >/dev/null 2>&1; then
  if bash "$ROOT/scripts/verify-apk-flavor.sh" "$DEFAULT_APK" trackchat 2>/dev/null; then
    ok "aapt package com.trackchat.runtime"
  else
    no "aapt verify failed"
  fi
else
  echo "  · aapt skip (install Android build-tools for package verify)"
fi

TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trackchat.local","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
  PUB=$(curl -sf -X POST "$API/creation/publish" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"APK验收探测","industry_key":"office","scenario_names":["制度政策问答"],"deliver":"both","source":"industry"}' 2>/dev/null || echo "")
  APP_ID=$(echo "$PUB" | python3 -c "import sys,json; print(json.load(sys.stdin).get('app',{}).get('id',''))" 2>/dev/null || echo "")
  if [ -n "$APP_ID" ]; then
    ok "publish app for APK download ($APP_ID)"
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/runtime/$APP_ID/download" 2>/dev/null || echo "000")
    if [ "$CODE" = "200" ]; then
      ok "GET /runtime/{id}/download HTTP 200"
    else
      no "GET /runtime/{id}/download HTTP $CODE"
    fi
  else
    no "publish for APK test ($PUB)"
  fi
else
  no "admin login for download test"
fi

echo ""
echo " Result: $PASS passed, $FAIL failed"
echo "=========================================="
[ "$FAIL" -eq 0 ]
