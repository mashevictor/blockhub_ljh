#!/usr/bin/env bash
# W5 冒烟：audit_logs · tenant PUT · runtime schema/manifest · CORS 生产域名
set -u
BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"
PASS=0; FAIL=0
ok(){ echo "  ✓ $1"; PASS=$((PASS+1)); }
no(){ echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "=========================================="
echo " W5 Smoke · $BASE"
echo "=========================================="

ADMIN=$(curl -sf -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@trackchat.local","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
[ -n "$ADMIN" ] && ok "admin login" || { no "admin login"; echo " Result: $PASS passed, $FAIL failed"; exit 1; }
AUTH="Authorization: Bearer $ADMIN"

# --- Tenant config GET/PUT + audit ---
BEFORE=$(curl -sf "$API/audit/logs?limit=1" -H "$AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("total",0))')
PUT=$(curl -sf -X PUT "$API/tenant/config?tenant=demo" -H "$AUTH" -H 'Content-Type: application/json' -d '{"app_name":"TrackChat W5","primary_color":"#2563eb"}')
echo "$PUT" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d.get("app_name")=="TrackChat W5"' \
  && ok "PUT /tenant/config" || no "PUT /tenant/config"
AFTER=$(curl -sf "$API/audit/logs?limit=5" -H "$AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("total",0))')
[ "$AFTER" -gt "$BEFORE" ] && ok "audit_logs incremented ($BEFORE->$AFTER)" || no "audit_logs write"
LOGS=$(curl -sf "$API/audit/logs?limit=3" -H "$AUTH")
echo "$LOGS" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d["total"]>=1 and d["items"][0]["resource"]=="tenant_config"' \
  && ok "GET /audit/logs" || no "GET /audit/logs"

# --- Publish app for runtime contract ---
PUB=$(curl -sf -X POST "$API/creation/publish" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"W5契约测试","industry_key":"office","scenario_ids":[],"scenario_names":["智能问答"],"deliver":"both","source":"industry"}')
if [ -n "$PUB" ]; then
  APP_ID=$(echo "$PUB" | python3 -c 'import sys,json;a=json.load(sys.stdin).get("app",{});print(a.get("id",""))')
  ok "publish app for runtime ($APP_ID)"
  echo "$PUB" | python3 -c '
import sys, json
d = json.load(sys.stdin)
asm = d.get("capability_assembly") or {}
assert asm.get("resolved_keys"), asm
' && ok "publish capability_assembly present" || no "capability_assembly missing"
  SCHEMA=$(curl -sf "$API/runtime/$APP_ID/schema")
  echo "$SCHEMA" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert "page_schema" in d and d["page_schema"]' \
    && ok "GET /runtime/{id}/schema" || no "runtime schema"
  MANIFEST=$(curl -sf "$API/runtime/$APP_ID/manifest")
  echo "$MANIFEST" | python3 -c 'import sys,json;d=json.load(sys.stdin);m=d["build_manifest"];assert m.get("capability_keys")' \
    && ok "GET /runtime/{id}/manifest" || no "runtime manifest"
  CFG=$(curl -sf "$API/tenant/config?tenant=demo&app_id=$APP_ID")
  echo "$CFG" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d.get("app",{}).get("id")' \
    && ok "tenant/config scoped to app" || no "tenant/config app scope"
else
  no "publish app for runtime"
fi

# --- Stats real PG (W4 D24, W5 regression) ---
STATS=$(curl -sf "$API/stats/dashboard" -H "$AUTH")
echo "$STATS" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d.get("total_scenarios",0)>=100' \
  && ok "stats/dashboard real PG (total_scenarios>=100)" || no "stats/dashboard"

# --- Catalog pagination count=114 ---
SUM=$(curl -sf "$API/catalog/summary" -H "$AUTH")
echo "$SUM" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d.get("total",0)>=114' \
  && ok "catalog summary total>=114" || no "catalog total<114"
OFF=$(curl -sf "$API/catalog/office?limit=10&offset=0" -H "$AUTH")
echo "$OFF" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d.get("total",0)>=60 and "limit" in d' \
  && ok "catalog/office pagination" || no "catalog/office pagination"

# --- CORS preflight (production origin) ---
CORS=$(curl -sf -X OPTIONS "$API/health" \
  -H 'Origin: https://124.222.177.43' \
  -H 'Access-Control-Request-Method: GET' -D - -o /dev/null 2>/dev/null | tr -d '\r' | grep -i 'access-control-allow-origin' || true)
if echo "$CORS" | grep -qE '101\.32\.209\.251|\*'; then
  ok "CORS allows production origin"
else
  no "CORS production origin ($CORS)"
fi

echo ""
echo " Result: $PASS passed, $FAIL failed"
echo "=========================================="
[ "$FAIL" -eq 0 ]
