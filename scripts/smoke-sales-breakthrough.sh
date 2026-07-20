#!/usr/bin/env bash
# 销售突破能力 API 冒烟（服务器部署后跑）
#
# 覆盖:
#   - GET/POST deal-evidence（空库列表 → 登记证据）
#   - sales-lead 晋级门禁（无证据 400 → 有证据可跟进）
#   - GET/POST kill-pipeline（杀单 + 原因聚合 + 线索回写 lost）
#
# 用法:
#   bash scripts/smoke-sales-breakthrough.sh
#   bash scripts/smoke-sales-breakthrough.sh http://127.0.0.1:8001
#   bash scripts/smoke-sales-breakthrough.sh https://blockhub.club
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... bash scripts/smoke-sales-breakthrough.sh http://127.0.0.1:8001
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

TMP="$(mktemp /tmp/sales-breakthrough-smoke.XXXXXX)"
trap 'rm -f "$TMP"' EXIT

echo "=========================================="
echo " Sales Breakthrough API Smoke · $SITE"
echo "=========================================="

login_once() {
  curl -sf --max-time 15 -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo ""
}

TOKEN=$(login_once)
if [[ -z "$TOKEN" ]]; then
  curl -sf --max-time 15 -X POST "$API/auth/demo-bootstrap" \
    -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 || true
  TOKEN=$(login_once)
fi
if [[ -z "$TOKEN" && "$API" != "http://127.0.0.1:8001/api/v1" ]]; then
  echo "  … retry via http://127.0.0.1:8001"
  API="http://127.0.0.1:8001/api/v1"
  TOKEN=$(login_once)
fi
if [[ -n "$TOKEN" ]]; then
  ok "admin login"
else
  bad "admin login"
  echo "  hint: bash scripts/repair-auth.sh 或检查 blockhub-api / DATABASE_URL"
  echo "fail=$FAIL pass=$PASS"
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"
CUST="冒烟客户-$(date +%s)"

http_json() {
  # usage: http_json METHOD PATH [BODY]
  local method="$1" path="$2" body="${3:-}"
  local code
  if [[ -n "$body" ]]; then
    code=$(curl -sS --max-time 20 -o "$TMP" -w "%{http_code}" -X "$method" "$API$path" \
      -H "$AUTH" -H "Content-Type: application/json" -d "$body" || echo "000")
  else
    code=$(curl -sS --max-time 20 -o "$TMP" -w "%{http_code}" -X "$method" "$API$path" \
      -H "$AUTH" || echo "000")
  fi
  echo "$code"
}

echo ""
echo "=== 1) 列表空库可读 ==="
CODE=$(http_json GET "/deal-evidence/records")
if [[ "$CODE" == "200" ]]; then ok "GET deal-evidence/records ($CODE)"; else bad "GET deal-evidence/records ($CODE) $(head -c 160 "$TMP")"; fi

CODE=$(http_json GET "/kill-pipeline/records")
if [[ "$CODE" == "200" ]]; then ok "GET kill-pipeline/records ($CODE)"; else bad "GET kill-pipeline/records ($CODE) $(head -c 160 "$TMP")"; fi

CODE=$(http_json GET "/kill-pipeline/reasons")
if [[ "$CODE" == "200" ]]; then ok "GET kill-pipeline/reasons ($CODE)"; else bad "GET kill-pipeline/reasons ($CODE) $(head -c 160 "$TMP")"; fi

CODE=$(http_json GET "/sales-lead/funnel")
if [[ "$CODE" == "200" ]]; then ok "GET sales-lead/funnel ($CODE)"; else bad "GET sales-lead/funnel ($CODE) $(head -c 160 "$TMP")"; fi

echo ""
echo "=== 2) 建线索 + 无证据晋级应 400 ==="
CODE=$(http_json POST "/sales-lead/records" "{\"customer\":\"$CUST\",\"amount\":\"9万\",\"note\":\"breakthrough-smoke\"}")
LEAD_ID=$(python3 -c "import json; d=json.load(open('$TMP')); print((d.get('record') or {}).get('id',''))" 2>/dev/null || echo "")
if [[ "$CODE" == "200" && -n "$LEAD_ID" ]]; then
  ok "POST sales-lead ($CUST)"
else
  bad "POST sales-lead ($CODE) $(head -c 200 "$TMP")"
fi

if [[ -n "$LEAD_ID" ]]; then
  CODE=$(http_json POST "/sales-lead/records/$LEAD_ID/following" "{}")
  DETAIL=$(python3 -c "import json; d=json.load(open('$TMP')); print(d.get('detail',''))" 2>/dev/null || echo "")
  if [[ "$CODE" == "400" ]]; then
    ok "following without evidence → 400"
  else
    bad "following without evidence expected 400 got $CODE detail=$DETAIL"
  fi
fi

echo ""
echo "=== 3) 登记成交证据后可晋级 ==="
CODE=$(http_json POST "/deal-evidence/records" "{\"customer\":\"$CUST\",\"evidence_type\":\"meeting_notes\",\"summary\":\"冒烟启动会纪要\",\"target_stage\":\"following\",\"lead_id\":\"$LEAD_ID\"}")
EV_ID=$(python3 -c "import json; d=json.load(open('$TMP')); print((d.get('record') or {}).get('id',''))" 2>/dev/null || echo "")
if [[ "$CODE" == "200" && -n "$EV_ID" ]]; then
  ok "POST deal-evidence"
else
  bad "POST deal-evidence ($CODE) $(head -c 200 "$TMP")"
fi

if [[ -n "$LEAD_ID" ]]; then
  CODE=$(http_json POST "/sales-lead/records/$LEAD_ID/following" "{}")
  ST=$(python3 -c "import json; d=json.load(open('$TMP')); print((d.get('record') or {}).get('status',''))" 2>/dev/null || echo "")
  if [[ "$CODE" == "200" && "$ST" == "following" ]]; then
    ok "following with evidence → following"
  else
    bad "following with evidence ($CODE status=$ST) $(head -c 200 "$TMP")"
  fi
fi

echo ""
echo "=== 4) 杀单 + 回写丢单 ==="
CODE=$(http_json POST "/kill-pipeline/records" "{\"customer\":\"$CUST\",\"kill_reason\":\"fake_pipeline\",\"learning\":\"无买方回执应早杀\",\"lead_id\":\"$LEAD_ID\"}")
KP_ID=$(python3 -c "import json; d=json.load(open('$TMP')); print((d.get('record') or {}).get('id',''))" 2>/dev/null || echo "")
if [[ "$CODE" == "200" && -n "$KP_ID" ]]; then
  ok "POST kill-pipeline"
else
  bad "POST kill-pipeline ($CODE) $(head -c 200 "$TMP")"
fi

if [[ -n "$LEAD_ID" ]]; then
  CODE=$(http_json GET "/sales-lead/records")
  ST=$(python3 -c "
import json
d=json.load(open('$TMP'))
lead='$LEAD_ID'
row=next((x for x in (d.get('items') or []) if x.get('id')==lead), None)
print(row.get('status') if row else '')
" 2>/dev/null || echo "")
  if [[ "$ST" == "lost" ]]; then
    ok "lead status after kill → lost"
  else
    bad "lead status after kill expected lost got '$ST'"
  fi
fi

CODE=$(http_json GET "/kill-pipeline/reasons")
HAS=$(python3 -c "
import json
d=json.load(open('$TMP'))
items=d.get('items') or []
print('1' if any(i.get('reason')=='fake_pipeline' or i.get('name')=='假管线' for i in items) else '0')
" 2>/dev/null || echo "0")
if [[ "$CODE" == "200" && "$HAS" == "1" ]]; then
  ok "kill reasons includes fake_pipeline"
else
  bad "kill reasons aggregate ($CODE has=$HAS)"
fi

echo ""
echo "=========================================="
echo " pass=$PASS fail=$FAIL"
echo "=========================================="
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
