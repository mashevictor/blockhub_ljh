#!/usr/bin/env bash
# W3 发布闭环验收：publish → schema/manifest/config → runtime → plaza 互动 → 双角色
# 用法: bash scripts/smoke-w3.sh [BASE_URL]
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"
pass=0
fail=0

ok() { echo "  ✓ $1"; pass=$((pass + 1)); }
bad() { echo "  ✗ $1"; fail=$((fail + 1)); }

login() {
  curl -sf -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))"
}

echo "=========================================="
echo " W3 Smoke · $BASE"
echo "=========================================="

ADMIN_TOKEN=$(login "admin@trackchat.local" "admin123")
EMP_TOKEN=$(login "employee@trackchat.local" "emp123")
if [ -n "$ADMIN_TOKEN" ]; then ok "admin login"; else bad "admin login"; fi
if [ -n "$EMP_TOKEN" ]; then ok "employee login"; else bad "employee login"; fi

PUBLISH=$(curl -sf -X POST "$API/creation/publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name":"W3冒烟应用",
    "industry_key":"office",
    "scenario_names":["请假审批","智能问答"],
    "capability_keys":["chat_qa","approval_flow"],
    "modules":[{"key":"chat_qa","label":"智能问答","kind":"module"},{"key":"approval_flow","label":"审批流","kind":"module"}],
    "deliver":"web",
    "source":"module",
    "contact_email":"w3-smoke@test.local"
  }' 2>/dev/null || echo "")

APP_ID=$(echo "$PUBLISH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('app',{}).get('id',''))" 2>/dev/null || echo "")
WEB_URL=$(echo "$PUBLISH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('app',{}).get('web_url',''))" 2>/dev/null || echo "")

if echo "$PUBLISH" | grep -q '"page_schema"'; then ok "publish page_schema"; else bad "publish page_schema"; fi
if echo "$PUBLISH" | grep -q '"build_manifest"'; then ok "publish build_manifest"; else bad "publish build_manifest"; fi
if [ -n "$WEB_URL" ]; then ok "publish web_url ($WEB_URL)"; else bad "publish web_url"; fi

if [ -n "$APP_ID" ]; then
  SCHEMA=$(curl -sf "$API/runtime/$APP_ID/schema" 2>/dev/null || echo "")
  MANIFEST=$(curl -sf "$API/runtime/$APP_ID/manifest" 2>/dev/null || echo "")
  CONFIG=$(curl -sf "$API/runtime/$APP_ID/config" 2>/dev/null || echo "")
  if echo "$SCHEMA" | grep -q '"page_schema"'; then ok "GET /runtime/{id}/schema"; else bad "GET /runtime/{id}/schema"; fi
  if echo "$MANIFEST" | grep -q 'web-capability-chat'; then ok "manifest web_pkg naming"; else bad "manifest web_pkg naming ($MANIFEST)"; fi
  if echo "$CONFIG" | grep -q '"app_name"'; then ok "GET /runtime/{id}/config"; else bad "GET /runtime/{id}/config"; fi

  PLAZA=$(curl -sf -X POST "$API/creation/plaza/publish" \
    -H "Content-Type: application/json" \
    -d "{\"app_id\":\"$APP_ID\",\"visibility\":\"public\"}" 2>/dev/null || echo "")
  if echo "$PLAZA" | grep -q '"success":true'; then ok "plaza publish"; else bad "plaza publish"; fi

  LIKE=$(curl -sf -X POST "$API/creation/plaza/feed/$APP_ID/like" \
    -H "Content-Type: application/json" \
    -d '{"user_key":"w3-smoke"}' 2>/dev/null || echo "")
  if echo "$LIKE" | grep -q '"liked":true'; then ok "plaza like"; else bad "plaza like ($LIKE)"; fi

  COMMENT=$(curl -sf -X POST "$API/creation/plaza/feed/$APP_ID/comment" \
    -H "Content-Type: application/json" \
    -d '{"author_name":"W3","text":"冒烟评论"}' 2>/dev/null || echo "")
  if echo "$COMMENT" | grep -q '"text":"冒烟评论"'; then ok "plaza comment"; else bad "plaza comment ($COMMENT)"; fi

  FEED=$(curl -sf "$API/creation/plaza/feed" 2>/dev/null || echo "")
  if echo "$FEED" | grep -q 'W3冒烟应用'; then ok "plaza feed includes app"; else bad "plaza feed"; fi
else
  bad "skip runtime/plaza (no app_id)"
fi

APPROVAL=$(curl -sf -X POST "$API/approvals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -d '{"title":"W3请假","type":"leave","payload":{"days":1}}' 2>/dev/null || echo "")
if echo "$APPROVAL" | grep -q '"approval"'; then ok "employee submit approval"; else bad "employee submit approval ($APPROVAL)"; fi

APPROVAL_ID=$(echo "$APPROVAL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('approval',{}).get('id',''))" 2>/dev/null || echo "")
if [ -n "$APPROVAL_ID" ]; then
  ACTION=$(curl -sf -X POST "$API/approvals/$APPROVAL_ID/action" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"action":"approve","comment":"W3 smoke"}' 2>/dev/null || echo "")
  if echo "$ACTION" | grep -q '"status":"approved"'; then ok "admin approve"; else bad "admin approve ($ACTION)"; fi
else
  bad "skip admin approve (no approval_id)"
fi

if [ -n "$APP_ID" ]; then
  COMMENTS=$(curl -sf "$API/creation/plaza/feed/$APP_ID/comments" 2>/dev/null || echo "")
  if echo "$COMMENTS" | grep -q '"items"'; then ok "GET plaza comments"; else bad "GET plaza comments"; fi
fi

echo ""
echo "=========================================="
echo " Result: $pass passed, $fail failed"
echo "=========================================="
[ "$fail" -eq 0 ] || exit 1
