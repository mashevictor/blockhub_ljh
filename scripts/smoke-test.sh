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
echo "=== Health ==="
check_json "GET /health" "$API/health" '"status"'

echo ""
echo "=== Catalog (PostgreSQL) ==="
SUMMARY=$(curl -sf "$API/catalog/summary" 2>/dev/null || echo "")
if echo "$SUMMARY" | grep -q '"source":"database"'; then ok "catalog source=database"; else bad "catalog source!=database ($SUMMARY)"; fi
if echo "$SUMMARY" | grep -q '"total":114'; then ok "catalog total=114"; else bad "catalog total!=114 ($SUMMARY)"; fi
if echo "$SUMMARY" | grep -q '"office_count":65'; then ok "office_count=65"; else bad "office_count!=65"; fi
if echo "$SUMMARY" | grep -q '"industry_count":49'; then ok "industry_count=49"; else bad "industry_count!=49"; fi

if echo "$SUMMARY" | grep -q '"hero_preset_count":30'; then ok "hero_preset_count=30"; else bad "hero_preset_count!=30 ($SUMMARY)"; fi

HERO=$(curl -sf "$API/catalog/hero-presets" 2>/dev/null || echo "")
if echo "$HERO" | grep -q '"total":30'; then ok "GET /catalog/hero-presets total=30"; else bad "GET /catalog/hero-presets ($HERO)"; fi

OFFICE=$(curl -sf "$API/catalog/office?lite=true" 2>/dev/null || echo "")
if echo "$OFFICE" | grep -q '"total":65'; then ok "GET /catalog/office lite"; else bad "GET /catalog/office"; fi

echo ""
echo "=== Agents (PostgreSQL) ==="
AGENTS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/agents" 2>/dev/null || echo "")
if echo "$AGENTS" | grep -q '"total":10'; then ok "GET /agents total=10"; else bad "GET /agents ($AGENTS)"; fi

echo ""
echo "=== Protected routes ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/stats/dashboard")
[ "$CODE" = "401" ] && ok "stats/dashboard 401 without token" || bad "stats/dashboard expected 401 got $CODE"

if [ -n "$TOKEN" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/stats/dashboard")
  [ "$CODE" = "200" ] && ok "stats/dashboard 200 with token" || bad "stats/dashboard expected 200 got $CODE"
fi

echo ""
echo "=== Creation (PostgreSQL) ==="
if [ -n "$TOKEN" ]; then
  PUBLISH=$(curl -sf -X POST "$API/creation/publish" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"冒烟测试应用","industry_key":"office","scenario_names":["制度政策问答"]}' 2>/dev/null || echo "")
  if echo "$PUBLISH" | grep -q '"success":true'; then ok "POST /creation/publish"; else bad "POST /creation/publish"; fi

  APPS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/creation/apps" 2>/dev/null || echo "")
  if echo "$APPS" | grep -q '冒烟测试应用'; then ok "GET /creation/apps"; else bad "GET /creation/apps"; fi
fi

echo ""
echo "=== OTP (optional) ==="
SEND=$(curl -sf -X POST "$API/auth/send-code" \
  -H "Content-Type: application/json" \
  -d '{"account":"13800138000"}' 2>/dev/null || echo "")
if echo "$SEND" | grep -q '"success":true'; then ok "POST /auth/send-code"; else bad "POST /auth/send-code"; fi

echo ""
echo "=========================================="
echo " Result: $pass passed, $fail failed"
echo "=========================================="
[ "$fail" -eq 0 ] || exit 1
