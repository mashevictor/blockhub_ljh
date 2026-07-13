#!/usr/bin/env bash
# Catalog 回归：114 基线 + 20 行业扩展（增量 sync 后 total 通常 250+）
# 用法: bash scripts/regression-114.sh [BASE_URL]
#
# 说明:
#   基础 114 = 65 office + 49 industry（最低保障）
#   部署后 sync_industry_packs_delta 会追加 ~140+ 行业场景 → total 约 250–300 属正常
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"
PASS=0
FAIL=0

ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
no() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "=========================================="
echo " Catalog Regression · $BASE"
echo " (基线 >=114，扩展 catalog 250+ 正常)"
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
PACKS=$(echo "$SUM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('industry_packs',0))" 2>/dev/null || echo 0)
HERO_N=$(echo "$SUM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('hero_preset_count',0))" 2>/dev/null || echo 0)
SOURCE=$(echo "$SUM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('source',''))" 2>/dev/null || echo "")

[ "$SOURCE" = "database" ] && ok "catalog source=database" || no "catalog source!=database ($SOURCE)"
[ "$TOTAL" -ge 114 ] 2>/dev/null && ok "total>=114 ($TOTAL)" || no "total<114 ($TOTAL)"
[ "$OFFICE" -ge 65 ] 2>/dev/null && ok "office_count>=65 ($OFFICE)" || no "office_count<65 ($OFFICE)"
[ "$INDUSTRY" -ge 49 ] 2>/dev/null && ok "industry_count>=49 ($INDUSTRY)" || no "industry_count<49 ($INDUSTRY)"
[ "$PACKS" -ge 20 ] 2>/dev/null && ok "industry_packs>=20 ($PACKS)" || tip_packs=1
if [ "${tip_packs:-0}" = 1 ]; then
  [ "$PACKS" -ge 1 ] 2>/dev/null && ok "industry_packs present ($PACKS)" || no "industry_packs missing ($PACKS)"
fi

OFF_PAGE=$(curl -sf "$API/catalog/office?limit=20&offset=0" 2>/dev/null || echo "")
OFF_TOTAL=$(echo "$OFF_PAGE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
OFF_ITEMS=$(echo "$OFF_PAGE" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('items',[])))" 2>/dev/null || echo 0)
[ "$OFF_TOTAL" -ge 65 ] 2>/dev/null && ok "office pagination total>=65 ($OFF_TOTAL)" || no "office pagination total ($OFF_TOTAL)"
[ "$OFF_ITEMS" -eq 20 ] 2>/dev/null && ok "office pagination limit=20" || no "office pagination items ($OFF_ITEMS)"

IND_PAGE=$(curl -sf "$API/catalog/industry?limit=10&offset=0" 2>/dev/null || echo "")
IND_TOTAL=$(echo "$IND_PAGE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
[ "$IND_TOTAL" -ge 49 ] 2>/dev/null && ok "industry pagination total>=49 ($IND_TOTAL)" || no "industry total ($IND_TOTAL)"

HERO=$(curl -sf "$API/catalog/hero-presets" 2>/dev/null || echo "")
HERO_TOTAL=$(echo "$HERO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
[ "$HERO_TOTAL" -ge 30 ] 2>/dev/null && ok "hero_presets>=30 ($HERO_TOTAL)" || no "hero_presets<30 ($HERO_TOTAL)"
[ "$HERO_N" -ge 30 ] 2>/dev/null && ok "summary hero_preset_count>=30 ($HERO_N)" || no "summary hero ($HERO_N)"

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
echo " 当前 catalog: office=$OFFICE industry=$INDUSTRY total=$TOTAL hero=$HERO_N"
echo "=========================================="
[ "$FAIL" -eq 0 ]
