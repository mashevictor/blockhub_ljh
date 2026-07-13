#!/usr/bin/env bash
# APK 验收：per-app 下载语义 + 契约一致性（不再依赖 default.apk 回退）
#
# 用法:
#   bash scripts/smoke-apk.sh http://101.32.209.251
#   WITH_BUILD=1 bash scripts/smoke-apk.sh http://127.0.0.1:8001  # 构建 per-app APK
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://101.32.209.251}"
API="$BASE/api/v1"
APK_DIR="$ROOT/backend/uploads/apks"
PASS=0
FAIL=0

ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
no() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "=========================================="
echo " APK Smoke · $BASE"
echo "=========================================="

login_once() {
  curl -sf -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@trackchat.local","password":"admin123"}' \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo ""
}

TOKEN=""
for attempt in 1 2 3; do
  TOKEN=$(login_once)
  if [ -n "$TOKEN" ]; then
    break
  fi
  echo "  · login attempt $attempt failed, retrying..."
  sleep 2
done

if [ -z "$TOKEN" ]; then
  curl -sf -X POST "$API/auth/demo-bootstrap" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 || true
  TOKEN=$(login_once)
fi

if [ -n "$TOKEN" ]; then
  ok "admin login"
else
  no "admin login (check: curl -sf $API/health && curl -X POST $API/auth/login ...)"
  echo "=========================================="
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"

PUB=$(curl -sf -X POST "$API/creation/publish" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"name":"APK验收探测","industry_key":"office","scenario_names":["制度政策问答"],"capability_keys":["chat_qa","approval_flow"],"deliver":"both","source":"industry"}' 2>/dev/null || echo "")

APP_ID=$(echo "$PUB" | python3 -c "import sys,json; print(json.load(sys.stdin).get('app',{}).get('id',''))" 2>/dev/null || echo "")
if [ -n "$APP_ID" ]; then
  ok "publish app for APK ($APP_ID)"
else
  no "publish for APK test"
  echo "=========================================="
  exit 1
fi

echo "$PUB" | python3 -c '
import sys, json
d = json.load(sys.stdin)
asm = d.get("capability_assembly") or {}
resolved = asm.get("resolved_keys") or []
assert "chat_qa" in resolved and "approval_flow" in resolved
' && ok "capability_assembly includes chat_qa + approval_flow" || no "capability_assembly"

PER_APK="$APK_DIR/${APP_ID}.apk"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/runtime/$APP_ID/download" 2>/dev/null || echo "000")

if [ -f "$PER_APK" ]; then
  SIZE=$(wc -c < "$PER_APK" | tr -d ' ')
  ok "per-app APK exists (${SIZE} bytes)"
  if [ "$CODE" = "200" ]; then
    ok "GET /runtime/{id}/download HTTP 200"
  else
    no "GET /runtime/{id}/download HTTP $CODE (file exists)"
  fi
elif [ "$CODE" = "503" ]; then
  ok "download HTTP 503 (专属 APK 未构建，符合不回退 default.apk)"
  if [ "${WITH_BUILD:-0}" = "1" ] && command -v flutter >/dev/null 2>&1; then
    echo ">>> building per-app APK via flutter-build-from-publish..."
    bash "$ROOT/scripts/flutter-build-from-publish.sh" "$APP_ID"
    if [ -f "$PER_APK" ]; then
      ok "per-app APK built"
      CODE2=$(curl -s -o /dev/null -w "%{http_code}" "$API/runtime/$APP_ID/download" 2>/dev/null || echo "000")
      [ "$CODE2" = "200" ] && ok "download HTTP 200 after build" || no "download HTTP $CODE2 after build"
    else
      no "per-app APK build failed"
    fi
  else
    echo "  · hint: WITH_BUILD=1 bash scripts/smoke-apk.sh $BASE"
  fi
else
  no "download HTTP $CODE (expected 503 or 200)"
fi

# 可选：检查构建队列 spec 含 capability_keys
SPEC="$APK_DIR/.build-queue/${APP_ID}.json"
if [ -f "$SPEC" ]; then
  python3 -c "
import json
from pathlib import Path
spec = json.loads(Path('$SPEC').read_text(encoding='utf-8'))
keys = spec.get('capability_keys') or []
assert 'chat_qa' in keys, keys
print('spec_keys', keys)
" && ok "build queue spec has capability_keys" || no "build queue spec missing keys"
fi

# default.apk 仅作通用构建产物，download API 不应依赖它
if [ -f "$APK_DIR/default.apk" ]; then
  echo "  · default.apk present (generic build artifact, not used for per-app download)"
fi

echo ""
echo " Result: $PASS passed, $FAIL failed"
echo "=========================================="
[ "$FAIL" -eq 0 ]
