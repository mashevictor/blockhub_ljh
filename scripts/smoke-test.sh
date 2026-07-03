#!/usr/bin/env bash
# BlockHub 冒烟测试（本地或服务器）
# 用法:
#   bash scripts/smoke-test.sh                          # 默认 http://127.0.0.1:8001 直连 API
#   bash scripts/smoke-test.sh http://101.32.209.251    # 经 Nginx（/api 代理）
#   bash scripts/smoke-test.sh http://127.0.0.1 --seed-only
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
SEED_ONLY=false
if [ "${2:-}" = "--seed-only" ] || [ "${1:-}" = "--seed-only" ]; then
  SEED_ONLY=true
  BASE="${1:-http://127.0.0.1:8001}"
  [ "$BASE" = "--seed-only" ] && BASE="http://127.0.0.1:8001"
fi

# Nginx 根路径 vs 直连 8001
if [[ "$BASE" == *":8001"* ]]; then
  API="$BASE/api/v1"
else
  API="$BASE/api/v1"
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

pass=0
fail=0

ok() { echo "  ✓ $1"; pass=$((pass + 1)); }
bad() { echo "  ✗ $1"; fail=$((fail + 1)); }

check_json() {
  local desc="$1" url="$2" expect="$3"
  local body
  body=$(curl -sf "$url" 2>/dev/null || echo "")
  if [ -z "$body" ]; then bad "$desc (no response)"; return; fi
  if echo "$body" | grep -q "$expect"; then ok "$desc"; else bad "$desc (got: $body)"; fi
}

echo "=========================================="
echo " BlockHub Smoke Test"
echo " API: $API"
echo "=========================================="

echo ""
echo "=== Auth + Seed ==="
TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
  ok "POST /auth/login"
else
  bad "POST /auth/login"
fi

if [ -n "$TOKEN" ]; then
  SEED_BODY=$(curl -sf -X POST "$API/seed" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"force":false}' 2>/dev/null || echo "")
  if echo "$SEED_BODY" | grep -q '"success":true'; then
    ok "POST /seed"
  else
    bad "POST /seed ($SEED_BODY)"
  fi
fi

if [ "$SEED_ONLY" = true ]; then
  echo ""
  echo "Seed-only mode done. pass=$pass fail=$fail"
  [ "$fail" -eq 0 ] || exit 1
  exit 0
fi

echo ""
echo "=== Health (D5 Redis) ==="
HEALTH=$(curl -sf "$API/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"status"'; then ok "GET /health status"; else bad "GET /health"; fi
if echo "$HEALTH" | grep -q '"redis":"ok"'; then
  ok "redis ping ok"
elif echo "$HEALTH" | grep -q '"redis":"unavailable"'; then
  ok "redis field present (unavailable — start: docker compose up -d redis)"
else
  bad "health missing redis field ($HEALTH)"
fi

echo ""
echo "=== Tenant config (D6) ==="
TENANT_CFG=$(curl -sf "$API/tenant/config?tenant=demo" 2>/dev/null || echo "")
if echo "$TENANT_CFG" | grep -q '"tenant_slug":"demo"'; then ok "GET /tenant/config"; else bad "GET /tenant/config ($TENANT_CFG)"; fi
if echo "$TENANT_CFG" | grep -q '"app_name"'; then ok "tenant config app_name"; else bad "tenant config missing app_name"; fi

echo ""
echo "=== Catalog (PostgreSQL) ==="
SUMMARY=$(curl -sf "$API/catalog/summary" 2>/dev/null || echo "")
if echo "$SUMMARY" | grep -q '"source":"database"'; then ok "catalog source=database"; else bad "catalog source!=database ($SUMMARY)"; fi

# 基础 114 = 65 office + 49 industry；hero 补录场景会使 total > 114，属正常
OFFICE_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('office_count',0))" 2>/dev/null || echo 0)
INDUSTRY_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('industry_count',0))" 2>/dev/null || echo 0)
TOTAL_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
HERO_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('hero_preset_count',0))" 2>/dev/null || echo 0)
CHIP_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('chip_template_count',0))" 2>/dev/null || echo 0)

[ "$INDUSTRY_COUNT" -eq 49 ] 2>/dev/null && ok "industry_count=49" || bad "industry_count!=49 ($SUMMARY)"
[ "$OFFICE_COUNT" -ge 65 ] 2>/dev/null && ok "office_count>=65 ($OFFICE_COUNT)" || bad "office_count<65 ($SUMMARY)"
[ "$TOTAL_COUNT" -ge 114 ] 2>/dev/null && ok "total>=114 ($TOTAL_COUNT)" || bad "total<114 ($SUMMARY)"
[ "$HERO_COUNT" -eq 30 ] 2>/dev/null && ok "hero_preset_count=30" || bad "hero_preset_count!=30 ($SUMMARY)"
[ "$CHIP_COUNT" -eq 5 ] 2>/dev/null && ok "chip_template_count=5" || bad "chip_template_count!=5 ($SUMMARY)"
AGENT_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('agent_count',0))" 2>/dev/null || echo 0)
[ "$AGENT_COUNT" -ge 11 ] 2>/dev/null && ok "agent_count>=11 ($AGENT_COUNT)" || bad "agent_count<11 ($SUMMARY)"

HERO=$(curl -sf "$API/catalog/hero-presets" 2>/dev/null || echo "")
if echo "$HERO" | grep -q '"total":30'; then ok "GET /catalog/hero-presets total=30"; else bad "GET /catalog/hero-presets ($HERO)"; fi

OFFICE=$(curl -sf "$API/catalog/office?lite=true" 2>/dev/null || echo "")
if echo "$OFFICE" | grep -q '"total":'; then ok "GET /catalog/office lite"; else bad "GET /catalog/office"; fi

if [ -n "$TOKEN" ]; then
  AGENTS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/agents" 2>/dev/null || echo "")
  if echo "$AGENTS" | grep -q '"total":11'; then ok "GET /agents total=11"; else bad "GET /agents ($AGENTS)"; fi
fi

echo ""
echo "=== Contract e-sign Agent ==="
if [ -n "$TOKEN" ]; then
  CFG=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/contracts/config" 2>/dev/null || echo "")
  if echo "$CFG" | grep -q 'contract_esign'; then ok "GET /contracts/config"; else bad "GET /contracts/config"; fi
  CID=$(curl -sf -X POST "$API/contracts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"title":"冒烟测试合同","template_key":"nda","parties":{"party_a":"测试甲","party_b":"测试乙"}}' \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('contract',{}).get('id',''))" 2>/dev/null || echo "")
  if [ -n "$CID" ]; then ok "POST /contracts ($CID)"; else bad "POST /contracts"; fi
  if [ -n "$CID" ]; then
    # 1x1 PNG
    PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    ASSET=$(curl -sf -X POST "$API/contracts/$CID/assets" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"asset_type\":\"signature\",\"data_url\":\"$PNG\"}" 2>/dev/null || echo "")
    if echo "$ASSET" | grep -q '"success":true'; then ok "POST /contracts/assets signature"; else bad "POST /contracts/assets"; fi
    SIGN=$(curl -sf -X POST "$API/contracts/$CID/sign" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "")
    if echo "$SIGN" | grep -q '"status":"signed"'; then ok "POST /contracts/sign"; else bad "POST /contracts/sign ($SIGN)"; fi
    PDF_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/contracts/$CID/signed.pdf")
    [ "$PDF_CODE" = "200" ] && ok "GET /contracts/signed.pdf" || bad "GET signed.pdf got $PDF_CODE"
  fi
fi

echo ""
echo "=== Protected routes (D3: no token → 403) ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/stats/dashboard")
[ "$CODE" = "403" ] && ok "stats/dashboard 403 without token" || bad "stats/dashboard expected 403 got $CODE"

if [ -n "$TOKEN" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/stats/dashboard")
  [ "$CODE" = "200" ] && ok "stats/dashboard 200 with token" || bad "stats/dashboard expected 200 got $CODE"
fi

EMP_TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@trackchat.local","password":"emp123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
if [ -n "$EMP_TOKEN" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/seed" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $EMP_TOKEN" \
    -d '{"force":false}')
  [ "$CODE" = "403" ] && ok "POST /seed 403 for employee" || bad "POST /seed expected 403 for employee got $CODE"
else
  bad "employee login for RBAC test"
fi

echo ""
echo "=== Chat SSE (D4) ==="
if [ -n "$TOKEN" ]; then
  CHAT_CFG=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/chat/config" 2>/dev/null || echo "")
  if echo "$CHAT_CFG" | grep -q '"stream_supported":true'; then ok "GET /chat/config stream_supported"; else bad "GET /chat/config"; fi
  STREAM=$(curl -sf -N -X POST "$API/chat/completions/stream" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"你好","session_id":"smoke"}' 2>/dev/null | head -c 200 || echo "")
  if echo "$STREAM" | grep -q 'data:'; then ok "POST /chat/completions/stream (SSE chunks)"; else bad "chat stream no SSE data"; fi
fi

echo ""
echo "=== Creation (PostgreSQL) ==="
if [ -n "$TOKEN" ]; then
  PUBLISH=$(curl -sf -X POST "$API/creation/publish" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"冒烟测试应用","industry_key":"office","scenario_names":["制度政策问答"],"deliver":"both","contact_email":"smoke-test@trackchat.local"}' 2>/dev/null || echo "")
  if echo "$PUBLISH" | grep -q '"success":true'; then ok "POST /creation/publish"; else bad "POST /creation/publish"; fi

  APP_ID=$(echo "$PUBLISH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('app',{}).get('id',''))" 2>/dev/null || echo "")
  if [ -n "$APP_ID" ]; then
    APP_CFG=$(curl -sf "$API/tenant/config?tenant=demo&app_id=$APP_ID" 2>/dev/null || echo "")
    if echo "$APP_CFG" | grep -q '冒烟测试应用'; then ok "GET /tenant/config?app_id (W1)"; else bad "tenant config app override"; fi

    RUNTIME=$(curl -sf "$API/runtime/$APP_ID" 2>/dev/null || echo "")
    if echo "$RUNTIME" | grep -q '"public_id"'; then ok "GET /runtime/{appId}"; else bad "GET /runtime/{appId} ($RUNTIME)"; fi
    if echo "$RUNTIME" | grep -q '"deliver"'; then ok "runtime deliver field"; else bad "runtime missing deliver"; fi
    if echo "$PUBLISH" | grep -q '"notification"'; then ok "publish notification payload"; else bad "publish missing notification"; fi
  fi

  APPS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/creation/apps" 2>/dev/null || echo "")
  if echo "$APPS" | grep -q '冒烟测试应用'; then ok "GET /creation/apps"; else bad "GET /creation/apps"; fi
fi

echo ""
echo "=== OTP (optional) ==="
OTP_ACCOUNT="smoke-otp-$(date +%s)@trackchat.local"
SEND=$(curl -sf -X POST "$API/auth/send-code" \
  -H "Content-Type: application/json" \
  -d "{\"account\":\"$OTP_ACCOUNT\"}" 2>/dev/null || echo "")
if echo "$SEND" | grep -q '"success":true'; then
  ok "POST /auth/send-code"
elif echo "$SEND" | grep -q '请 .* 秒后再获取'; then
  ok "POST /auth/send-code (rate-limited, endpoint alive)"
else
  bad "POST /auth/send-code ($SEND)"
fi

echo ""
echo "=========================================="
echo " Result: $pass passed, $fail failed"
echo "=========================================="
[ "$fail" -eq 0 ] || exit 1
