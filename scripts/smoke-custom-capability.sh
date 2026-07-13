#!/usr/bin/env bash
# 自定义能力：提案 → 列表 → 审核
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"
PASS=0
FAIL=0

ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
no() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "=========================================="
echo " Custom Capability Smoke · $BASE"
echo "=========================================="

TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trackchat.local","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  no "admin login"
  exit 1
fi
ok "admin login"

KEY="smoke_cap_$(date +%s)"
PROPOSE=$(curl -sf -X POST "$API/creation/custom-capabilities" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"key\":\"$KEY\",\"name\":\"冒烟自定义能力\",\"description\":\"smoke test\"}" 2>/dev/null || echo "")

CAP_ID=$(echo "$PROPOSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('item',{}).get('id',''))" 2>/dev/null || echo "")
if [ -n "$CAP_ID" ]; then
  ok "POST /creation/custom-capabilities ($CAP_ID)"
else
  no "POST /creation/custom-capabilities ($PROPOSE)"
  exit 1
fi

LIST=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/creation/custom-capabilities?status=pending" 2>/dev/null || echo "")
if echo "$LIST" | grep -q "$KEY"; then
  ok "GET /creation/custom-capabilities pending"
else
  no "GET pending list ($LIST)"
fi

REVIEW=$(curl -sf -X POST "$API/creation/custom-capabilities/$CAP_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"approve"}' 2>/dev/null || echo "")
if echo "$REVIEW" | grep -q '"status":"approved"'; then
  ok "POST review approve"
else
  no "POST review ($REVIEW)"
fi

echo ""
echo " Result: $PASS passed, $FAIL failed"
echo "=========================================="
[ "$FAIL" -eq 0 ]
