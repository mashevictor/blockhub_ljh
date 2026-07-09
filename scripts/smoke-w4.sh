#!/usr/bin/env bash
# W4 七 Agent 真集成冒烟：报表/通知/集成（非 Mock）+ 审批联动通知
set -u
BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"
PASS=0; FAIL=0
ok(){ echo "  ✓ $1"; PASS=$((PASS+1)); }
no(){ echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "=========================================="
echo " W4 Smoke · $BASE"
echo "=========================================="

ADMIN=$(curl -sf -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@trackchat.local","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
EMP=$(curl -sf -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"email":"employee@trackchat.local","password":"emp123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
[ -n "$ADMIN" ] && ok "admin login" || no "admin login"
[ -n "$EMP" ] && ok "employee login" || no "employee login"
AUTH="Authorization: Bearer $ADMIN"

# --- Reports: real aggregation ---
DASH=$(curl -sf "$API/reports/dashboard" -H "$AUTH")
if [ -n "$DASH" ]; then
  echo "$DASH" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert "kpis" in d and "agent_usage" in d and "approval_trend" in d, "missing keys";print("   kpis:",len(d["kpis"]),"| agent_usage:",len(d["agent_usage"]),"| total_calls:",d["total_calls"])' \
    && ok "reports dashboard real aggregation" || no "reports dashboard shape"
else
  no "reports dashboard"
fi

# --- Integration: connector CRUD + sync ---
CONN=$(curl -sf -X POST "$API/integrations" -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"HR 系统","connector_type":"webhook","config":{"tables":["employees","leaves"]}}')
if [ -n "$CONN" ]; then
  CID=$(echo "$CONN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["connector"]["id"])')
  ok "integration create connector"
  SYNC=$(curl -sf -X POST "$API/integrations/$CID/sync" -H "$AUTH")
  echo "$SYNC" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d["job"]["status"]=="success"' \
    && ok "integration sync job success" || no "integration sync"
  JOBS=$(curl -sf "$API/integrations/$CID/jobs" -H "$AUTH")
  echo "$JOBS" | python3 -c 'import sys,json;assert json.load(sys.stdin)["total"]>=1' \
    && ok "integration jobs listed" || no "integration jobs"
else
  no "integration create connector"
fi

# --- Notifications: approval linkage ---
NBEFORE=$(curl -sf "$API/notifications" -H "$AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin)["total"])')
# employee submits an approval
SUB=$(curl -sf -X POST "$API/approvals" -H "Authorization: Bearer $EMP" -H 'Content-Type: application/json' -d '{"title":"W4冒烟请假","type":"leave","department":"研发部","summary":"测试"}')
[ -n "$SUB" ] && ok "employee submit approval" || no "employee submit approval"
# admin should now see a new notification (submit -> notify admins)
NAFTER=$(curl -sf "$API/notifications" -H "$AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin)["total"])')
[ "$NAFTER" -gt "$NBEFORE" ] && ok "submit triggered admin notification ($NBEFORE->$NAFTER)" || no "submit notification"

# admin approves
AID=$(echo "$SUB" | python3 -c 'import sys,json;print(json.load(sys.stdin)["approval"]["id"])')
ACT=$(curl -sf -X POST "$API/approvals/$AID/action" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"approve","comment":"同意"}')
[ -n "$ACT" ] && ok "admin approve" || no "admin approve"
# employee should see a result notification
EMP_NOTES=$(curl -sf "$API/notifications" -H "Authorization: Bearer $EMP")
echo "$EMP_NOTES" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert any(n["type"]=="approval_result" for n in d["items"]), "no result notification"' \
  && ok "approve triggered applicant notification" || no "applicant notification"

# mark read
NID=$(curl -sf "$API/notifications" -H "$AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')
MR=$(curl -sf -X POST "$API/notifications/$NID/read" -H "$AUTH")
[ -n "$MR" ] && ok "mark notification read" || no "mark read"

# --- W4 D22–D24: catalog pagination + tenant config + stats ---
SUM=$(curl -sf "$API/catalog/summary" -H "$AUTH")
echo "$SUM" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d.get("total")==114' \
  && ok "catalog total=114" || no "catalog total=114"
OFF=$(curl -sf "$API/catalog/office?limit=20&offset=0" -H "$AUTH")
echo "$OFF" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d["total"]>=60 and len(d["items"])<=20' \
  && ok "catalog/office pagination" || no "catalog/office pagination"
TEN=$(curl -sf "$API/tenant/config?tenant=demo" -H "$AUTH")
echo "$TEN" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert d.get("tenant_slug")=="demo"' \
  && ok "GET /tenant/config" || no "GET /tenant/config"
DASH=$(curl -sf "$API/stats/dashboard" -H "$AUTH")
echo "$DASH" | python3 -c 'import sys,json;d=json.load(sys.stdin);assert "apps_created" in d and d.get("total_scenarios",0)>=100' \
  && ok "stats/dashboard real PG" || no "stats/dashboard"

echo ""
echo " Result: $PASS passed, $FAIL failed"
echo "=========================================="
[ "$FAIL" -eq 0 ]
