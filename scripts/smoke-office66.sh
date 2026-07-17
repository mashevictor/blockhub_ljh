#!/usr/bin/env bash
# 通用办公 66 场景 · API 冒烟（部署后在服务器跑）
#
# 用法:
#   bash scripts/smoke-office66.sh
#   bash scripts/smoke-office66.sh https://blockhub.club
#   bash scripts/smoke-office66.sh http://127.0.0.1:8001
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... bash scripts/smoke-office66.sh https://blockhub.club
#
# 覆盖：assembly=66 → publish 全量 → schema menu → 请假/报销/会议室/IT/资产/入职/审批 提交+列表+推进
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
BASE="${BASE%/}"
if [[ "$BASE" == *"/api/v1" ]]; then
  API="$BASE"
  SITE="${BASE%/api/v1}"
else
  API="$BASE/api/v1"
  SITE="$BASE"
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

PASS=0
FAIL=0
ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
need() {
  if [[ -z "${1:-}" ]]; then
    bad "$2"
    return 1
  fi
  ok "$2"
  return 0
}

echo "=========================================="
echo " Office66 API Smoke · $SITE"
echo "=========================================="

login_once() {
  curl -sf -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo ""
}

login_diag() {
  echo "  login POST $API/auth/login as $ADMIN_EMAIL"
  local code body
  code=$(curl -sS -o /tmp/office66_login.json -w "%{http_code}" -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" || echo "000")
  body=$(head -c 400 /tmp/office66_login.json 2>/dev/null || true)
  echo "  HTTP $code body=${body}"
  if [[ "$code" == "401" ]]; then
    echo "  hint: 密码可能已改。在服务器执行: bash scripts/repair-auth.sh"
    echo "        或: ADMIN_EMAIL=... ADMIN_PASSWORD=... bash scripts/smoke-office66.sh $SITE"
  elif [[ "$code" == "000" || "$code" == "502" || "$code" == "503" ]]; then
    echo "  hint: API 不可达。检查: curl -sf $API/../health ; systemctl status blockhub-api"
  elif echo "$body" | grep -q '数据库'; then
    echo "  hint: 数据库不可用。检查 PostgreSQL / DATABASE_URL"
  fi
}

TOKEN=$(login_once)
if [[ -z "$TOKEN" ]]; then
  echo "  … login failed, try demo-bootstrap"
  curl -sf -X POST "$API/auth/demo-bootstrap" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 || true
  TOKEN=$(login_once)
fi
if [[ -n "$TOKEN" ]]; then
  ok "admin login"
else
  bad "admin login"
  login_diag
  # 本机直连 API（部署机上常比经 Nginx 更稳）
  if [[ "$API" != "http://127.0.0.1:8001/api/v1" ]]; then
    echo "  … retry via http://127.0.0.1:8001"
    API="http://127.0.0.1:8001/api/v1"
    TOKEN=$(login_once)
    if [[ -n "$TOKEN" ]]; then
      ok "admin login (localhost:8001)"
      SITE="http://127.0.0.1:8001"
    fi
  fi
fi
if [[ -z "$TOKEN" ]]; then
  echo "fail=$FAIL"
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"

echo ""
echo "=== 1) industry assembly office ==="
ASM=$(curl -sf "$API/creation/industry/office/assembly" || echo "")
if [[ -z "$ASM" ]]; then
  bad "GET assembly"
else
  echo "$ASM" | python3 -c '
import json,sys
d=json.load(sys.stdin)
a=d.get("assembly") or d
sc=int(a.get("scene_count") or 0)
mp=len(a.get("menu_plan") or [])
keys=a.get("capability_keys") or []
print(f"scene_count={sc} menu_plan={mp} caps={len(keys)}")
assert sc==66, sc
assert mp==66, mp
assert len(keys)>=14, keys
print("keys=", ",".join(keys[:12]), "...")
' && ok "assembly scene_count=66" || bad "assembly scene_count!=66"
fi

echo ""
echo "=== 2) publish office full (66) ==="
PUB=$(curl -sf -X POST "$API/creation/publish" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{
    "name":"Office66-Smoke",
    "industry_key":"office",
    "scenario_names":[],
    "capability_keys":[],
    "source":"industry",
    "deliver":"web",
    "assemble_full_scenes":true,
    "web_template_id":"sidebar_admin",
    "app_ui_id":"drawer_nav"
  }' || echo "")
APP_ID=""
if [[ -z "$PUB" ]]; then
  bad "publish office"
else
  APP_ID=$(echo "$PUB" | python3 -c 'import sys,json;d=json.load(sys.stdin);print((d.get("app") or d).get("id",""))' 2>/dev/null || echo "")
  MENU_N=$(echo "$PUB" | python3 -c '
import sys,json
d=json.load(sys.stdin)
app=d.get("app") or d
schema=app.get("page_schema") or {}
print(len(schema.get("menu") or []))
' 2>/dev/null || echo 0)
  need "$APP_ID" "publish app_id=$APP_ID"
  if [[ "${MENU_N:-0}" -ge 60 ]]; then ok "publish menu>=60 ($MENU_N)"; else bad "publish menu=$MENU_N (expect ~66)"; fi
fi

if [[ -n "$APP_ID" ]]; then
  echo ""
  echo "=== 3) runtime schema ==="
  SCH=$(curl -sf "$API/runtime/$APP_ID/schema" -H "$AUTH" || echo "")
  if [[ -z "$SCH" ]]; then
    bad "GET runtime schema"
  else
    echo "$SCH" | python3 -c '
import json,sys
d=json.load(sys.stdin)
m=(d.get("page_schema") or {}).get("menu") or []
print("menu=", len(m))
assert len(m)>=60, len(m)
caps=set()
for i in m:
  k=i.get("capability_key") or ""
  if k: caps.add(k)
need=["leave_request","expense_claim","approval_flow","meeting_booking","it_ticket","asset_manage"]
miss=[x for x in need if x not in caps]
assert not miss, miss
print("cap_sample_ok")
' && ok "runtime menu+caps" || bad "runtime schema assert"
  fi
fi

py_json() {
  python3 -c "$1"
}

echo ""
echo "=== 4) leave_request 提交→列表→通过 ==="
LR=$(curl -sf -X POST "$API/leave-request/records" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"category\":\"annual\",\"applicant\":\"smoke\",\"start_at\":\"2026-07-20\",\"end_at\":\"2026-07-21\",\"note\":\"office66\",\"app_public_id\":\"${APP_ID:-preview-office}\"}" || echo "")
LR_ID=$(echo "$LR" | py_json 'import sys,json;d=json.load(sys.stdin);print((d.get("record") or {}).get("id",""))' 2>/dev/null || echo "")
if need "$LR_ID" "leave create id=${LR_ID:0:8}"; then
  LIST=$(curl -sf "$API/leave-request/records?app_id=${APP_ID:-}" -H "$AUTH" || echo "")
  echo "$LIST" | py_json "import sys,json;d=json.load(sys.stdin);assert d.get('total',0)>=1;print('total',d.get('total'))" \
    && ok "leave list" || bad "leave list"
  ADV=$(curl -sf -X POST "$API/leave-request/records/$LR_ID/approved" \
    -H "$AUTH" -H "Content-Type: application/json" -d '{}' || echo "")
  echo "$ADV" | py_json 'import sys,json;d=json.load(sys.stdin);assert (d.get("record") or {}).get("status")=="approved"' \
    && ok "leave approved" || bad "leave approved"
fi

echo ""
echo "=== 5) expense_claim 提交→审核中 ==="
EC=$(curl -sf -X POST "$API/expense-claim/records" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"category\":\"travel\",\"title\":\"差旅冒烟\",\"amount\":\"128\",\"note\":\"office66\",\"app_public_id\":\"${APP_ID:-}\"}" || echo "")
EC_ID=$(echo "$EC" | py_json 'import sys,json;d=json.load(sys.stdin);print((d.get("record") or {}).get("id",""))' 2>/dev/null || echo "")
if need "$EC_ID" "expense create"; then
  curl -sf -X POST "$API/expense-claim/records/$EC_ID/reviewing" -H "$AUTH" -H "Content-Type: application/json" -d '{}' >/dev/null \
    && ok "expense reviewing" || bad "expense reviewing"
fi

echo ""
echo "=== 6) meeting_booking 提交→确认 ==="
MT=$(curl -sf -X POST "$API/meeting-booking/records" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"room_name\":\"A301\",\"title\":\"冒烟会\",\"start_at\":\"2026-07-20 14:00\",\"end_at\":\"2026-07-20 15:00\",\"app_public_id\":\"${APP_ID:-}\"}" || echo "")
MT_ID=$(echo "$MT" | py_json 'import sys,json;d=json.load(sys.stdin);print((d.get("record") or {}).get("id",""))' 2>/dev/null || echo "")
if need "$MT_ID" "meeting create"; then
  curl -sf -X POST "$API/meeting-booking/records/$MT_ID/confirmed" -H "$AUTH" -H "Content-Type: application/json" -d '{}' >/dev/null \
    && ok "meeting confirmed" || bad "meeting confirmed"
fi

echo ""
echo "=== 7) it_ticket 提交→处理中 ==="
IT=$(curl -sf -X POST "$API/it-ticket/tickets" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"category\":\"hardware\",\"title\":\"冒烟报障\",\"detail\":\"网口\",\"urgency\":\"medium\",\"app_public_id\":\"${APP_ID:-}\"}" || echo "")
IT_ID=$(echo "$IT" | py_json 'import sys,json;d=json.load(sys.stdin);print((d.get("ticket") or d.get("record") or {}).get("id",""))' 2>/dev/null || echo "")
if need "$IT_ID" "it_ticket create"; then
  curl -sf -X POST "$API/it-ticket/tickets/$IT_ID/processing" -H "$AUTH" -H "Content-Type: application/json" -d '{}' >/dev/null \
    && ok "it_ticket processing" || bad "it_ticket processing"
fi

echo ""
echo "=== 8) asset_manage 提交→通过 ==="
AS=$(curl -sf -X POST "$API/asset-manage/records" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"category\":\"borrow\",\"asset_name\":\"笔记本\",\"quantity\":\"1\",\"note\":\"smoke\",\"app_public_id\":\"${APP_ID:-}\"}" || echo "")
AS_ID=$(echo "$AS" | py_json 'import sys,json;d=json.load(sys.stdin);print((d.get("record") or {}).get("id",""))' 2>/dev/null || echo "")
if need "$AS_ID" "asset create"; then
  curl -sf -X POST "$API/asset-manage/records/$AS_ID/approved" -H "$AUTH" -H "Content-Type: application/json" -d '{}' >/dev/null \
    && ok "asset approved" || bad "asset approved"
fi

echo ""
echo "=== 9) hire_onboard 提交→面试 ==="
HO=$(curl -sf -X POST "$API/hire-onboard/records" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"candidate\":\"冒烟候选人\",\"stage\":\"初试\",\"note\":\"smoke\",\"app_public_id\":\"${APP_ID:-}\"}" || echo "")
HO_ID=$(echo "$HO" | py_json 'import sys,json;d=json.load(sys.stdin);print((d.get("record") or {}).get("id",""))' 2>/dev/null || echo "")
if need "$HO_ID" "hire create"; then
  curl -sf -X POST "$API/hire-onboard/records/$HO_ID/interview" -H "$AUTH" -H "Content-Type: application/json" -d '{}' >/dev/null \
    && ok "hire interview" || bad "hire interview"
fi

echo ""
echo "=== 10) approvals 提交→通过 ==="
AP=$(curl -sf -X POST "$API/approvals" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"账号权限冒烟","type":"account_access","department":"IT","summary":"office66 smoke"}' || echo "")
AP_ID=$(echo "$AP" | py_json 'import sys,json;d=json.load(sys.stdin);print((d.get("approval") or {}).get("id",""))' 2>/dev/null || echo "")
if need "$AP_ID" "approval create"; then
  curl -sf -X POST "$API/approvals/$AP_ID/action" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d '{"action":"approve","comment":"smoke ok"}' >/dev/null \
    && ok "approval approve" || bad "approval approve (需 admin)"
fi

echo ""
echo "=== 11) compose-edit（DeepSeek/本地规则）==="
CE=$(curl -sf -X POST "$API/creation/compose-edit" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"instruction":"加一个团建经费审批","app_name":"Office66","menu":[{"key":"o2","label":"请假申请","capability_key":"leave_request"}],"capability_keys":["leave_request"]}' || echo "")
if [[ -z "$CE" ]]; then
  bad "compose-edit"
else
  echo "$CE" | py_json '
import json,sys
d=json.load(sys.stdin)
ops=d.get("ops") or []
print("source=", d.get("source"), "ops=", len(ops), "reply=", (d.get("reply") or "")[:60])
assert isinstance(ops, list)
' && ok "compose-edit returns" || bad "compose-edit parse"
fi

echo ""
echo "=========================================="
echo " pass=$PASS fail=$FAIL"
if [[ -n "$APP_ID" ]]; then
  echo " Runtime UI:  $SITE/r/$APP_ID"
fi
echo " Preview UI:  $SITE/preview/industry-runtime/office"
echo " 交互脚本:    bash scripts/smoke-office66-ui.sh $SITE ${APP_ID:-}"
echo "=========================================="
[[ "$FAIL" -eq 0 ]]
