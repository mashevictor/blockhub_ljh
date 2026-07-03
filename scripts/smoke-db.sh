#!/usr/bin/env bash
# 快速检查 PostgreSQL 是否可用（经 API 探测）
# 用法:
#   bash scripts/smoke-db.sh                          # 服务器本机经 Nginx
#   bash scripts/smoke-db.sh http://101.32.209.251    # 外网经 Nginx
#   bash scripts/smoke-db.sh http://127.0.0.1:8001    # 直连 API 进程
set -euo pipefail

BASE="${1:-http://127.0.0.1}"
API="$BASE/api/v1"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

pass=0
fail=0
ok() { echo "  ✓ $1"; pass=$((pass + 1)); }
bad() { echo "  ✗ $1"; fail=$((fail + 1)); }

echo "=========================================="
echo " BlockHub DB Smoke (via API)"
echo " Target: $API"
echo "=========================================="

HEALTH=$(curl -sf "$API/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"status"'; then ok "API /health"; else bad "API /health (is blockhub-api running?)"; fi

SUMMARY=$(curl -sf "$API/catalog/summary" 2>/dev/null || echo "")
if echo "$SUMMARY" | grep -q '"source":"database"'; then
  ok "Catalog reads PostgreSQL (source=database)"
  echo "$SUMMARY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"      office={d.get('office_count')} industry={d.get('industry_count')} total={d.get('total')}\")
" 2>/dev/null || true
else
  bad "Catalog not from database — PG down or schema missing? ($SUMMARY)"
fi

LOGIN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || echo "")
if echo "$LOGIN" | grep -q 'access_token'; then
  ok "users table + password login"
else
  bad "login failed (503=PG down, 401=wrong password) — $LOGIN"
fi

PUBLISH=$(curl -sf -X POST "$API/creation/publish" \
  -H "Content-Type: application/json" \
  -d '{"name":"DB冒烟探测","industry_key":"office","scenario_names":["制度政策问答"],"contact_email":"smoke@test.local"}' 2>/dev/null || echo "")
if echo "$PUBLISH" | grep -q '"success":true'; then ok "apps table write (POST /creation/publish)"; else bad "apps write failed — $PUBLISH"; fi

echo ""
echo "=========================================="
echo " Result: $pass passed, $fail failed"
if [ "$fail" -eq 0 ]; then
  echo " PostgreSQL 链路正常"
else
  echo " 修复建议:"
  echo "   sudo systemctl status blockhub-api"
  echo "   sudo systemctl status postgresql"
  echo "   bash scripts/repair-db.sh"
  echo "   bash scripts/diagnose-api.sh"
fi
echo "=========================================="
[ "$fail" -eq 0 ] || exit 1
