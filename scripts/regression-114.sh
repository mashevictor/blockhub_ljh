#!/usr/bin/env bash
# 114 场景回归：catalog 基线 + 分页 + 关键 API 可用性
# 用法: bash scripts/regression-114.sh [BASE_URL]
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"
PASS=0
FAIL=0

ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
no() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "=========================================="
echo " 114 Regression · $BASE"
echo "=========================================="

SUM=$(curl -sf "$API/catalog/summary" 2>/dev/null || echo "")
if [ -z "$SUM" ]; then
  no "GET /catalog/summary (no response)"
  echo " Result: $PASS passed, $FAIL failed"
  exit 1
fi

TOTAL=$(echo "$SUM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
OFFICE=$(echo "$SUM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('office_count',0))" 2>/dev/null || echo 0)
INDUSTRY=$(echo "$SUM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('industry_count',0))" 2>/dev/null || echo 0)
SOURCE=$(echo "$SUM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('source',''))" 2>/dev/null || echo "")

[ "$SOURCE" = "database" ] && ok "catalog source=database" || no "catalog source!=database ($SOURCE)"
[ "$TOTAL" -eq 114 ] 2>/dev/null && ok "total=114" || no "total!=114 ($TOTAL)"
[ "$OFFICE" -eq 65 ] 2>/dev/null && ok "office_count=65" || no "office_count!=65 ($OFFICE)"
[ "$INDUSTRY" -eq 49 ] 2>/dev/null && ok "industry_count=49" || no "industry_count!=49 ($INDUSTRY)"

OFF_PAGE=$(curl -sf "$API/catalog/office?limit=20&offset=0" 2>/dev/null || echo "")
OFF_TOTAL=$(echo "$OFF_PAGE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
OFF_ITEMS=$(echo "$OFF_PAGE" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('items',[])))" 2>/dev/null || echo 0)
[ "$OFF_TOTAL" -ge 65 ] 2>/dev/null && ok "office pagination total>=65" || no "office pagination total ($OFF_TOTAL)"
[ "$OFF_ITEMS" -eq 20 ] 2>/dev/null && ok "office pagination limit=20" || no "office pagination items ($OFF_ITEMS)"

IND_PAGE=$(curl -sf "$API/catalog/industry?limit=10&offset=0" 2>/dev/null || echo "")
IND_TOTAL=$(echo "$IND_PAGE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
[ "$IND_TOTAL" -eq 49 ] 2>/dev/null && ok "industry pagination total=49" || no "industry total ($IND_TOTAL)"

HERO=$(curl -sf "$API/catalog/hero-presets" 2>/dev/null || echo "")
HERO_TOTAL=$(echo "$HERO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
[ "$HERO_TOTAL" -eq 30 ] 2>/dev/null && ok "hero_presets=30" || no "hero_presets ($HERO_TOTAL)"

TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trackchat.local","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
if [ -n "$TOKEN" ]; then
  STATS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/stats/dashboard" 2>/dev/null || echo "")
  SCEN=$(echo "$STATS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total_scenarios',0))" 2>/dev/null || echo 0)
  [ "$SCEN" -ge 114 ] 2>/dev/null && ok "dashboard total_scenarios>=114 ($SCEN)" || no "dashboard scenarios ($SCEN)"
else
  no "admin login"
fi

echo ""
echo " Result: $PASS passed, $FAIL failed"
echo "=========================================="
[ "$FAIL" -eq 0 ]
