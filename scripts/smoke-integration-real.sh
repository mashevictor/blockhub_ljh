#!/usr/bin/env bash
# P4-I1：真实 Adapter sync + CRM Webhook 验签入站
# 用法: bash scripts/smoke-integration-real.sh [BASE_URL]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://127.0.0.1:8001}"
if [[ "$BASE" == *":8001"* ]] || [[ "$BASE" == *":8000"* ]]; then
  API="${BASE%/}/api/v1"
else
  API="${BASE%/}/api/v1"
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
SECRET="smoke-hmac-secret"

pass=0
fail=0
ok() { echo "  ✓ $1"; pass=$((pass + 1)); }
bad() { echo "  ✗ $1"; fail=$((fail + 1)); }

echo "=========================================="
echo " BlockHub Integration Real Smoke (P4-I1)"
echo " Target: $API"
echo "=========================================="

LOGIN=$(curl -sf -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" || true)
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)
if [ -z "$TOKEN" ]; then
  bad "admin login"
  echo "FAIL: cannot login"
  exit 1
fi
ok "admin login"

CREATE=$(curl -sf -X POST "$API/integrations" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Smoke CRM Webhook",
    "connector_type": "webhook",
    "config": {
      "vendor": "generic_crm",
      "webhook_secret": "'"$SECRET"'",
      "field_map": {"id": "external_id", "title": "name", "type": "event_type"},
      "pending_records": [{"id": "smoke-pending-1", "title": "待同步线索", "type": "crm.lead"}]
    }
  }' || true)
CID=$(echo "$CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('connector',{}).get('id',''))" 2>/dev/null || true)
if [ -z "$CID" ]; then
  bad "create connector"
  exit 1
fi
ok "create connector ($CID)"

SYNC=$(curl -sf -X POST "$API/integrations/$CID/sync" \
  -H "Authorization: Bearer $TOKEN" || true)
REC=$(echo "$SYNC" | python3 -c "import sys,json; print(json.load(sys.stdin).get('job',{}).get('records_synced',0))" 2>/dev/null || echo 0)
ADAPTER=$(echo "$SYNC" | python3 -c "import sys,json; print((json.load(sys.stdin).get('job',{}).get('result') or {}).get('adapter',''))" 2>/dev/null || true)
if [ "${REC:-0}" -ge 1 ] && [[ "$ADAPTER" == *Adapter* ]]; then
  ok "sync via Adapter records_synced=$REC adapter=$ADAPTER"
else
  bad "sync via Adapter (records=$REC adapter=$ADAPTER)"
fi

BODY='{"id":"smoke-lead-42","title":"入站线索","type":"crm.lead","amount":1000}'
SIG=$(python3 - <<PY
import hmac, hashlib
secret = b"$SECRET"
body = b'''$BODY'''
print("sha256=" + hmac.new(secret, body, hashlib.sha256).hexdigest())
PY
)

INGRESS=$(curl -sf -X POST "$API/integrations/ingress/webhook?connector_id=$CID" \
  -H "Content-Type: application/json" \
  -H "X-BlockHub-Signature: $SIG" \
  -d "$BODY" || true)
IN_REC=$(echo "$INGRESS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('records_synced',0))" 2>/dev/null || echo 0)
if [ "${IN_REC:-0}" -ge 1 ]; then
  ok "ingress webhook HMAC records_synced=$IN_REC"
else
  bad "ingress webhook HMAC (got: $INGRESS)"
fi

EVENTS=$(curl -sf "$API/integrations/$CID/events" -H "Authorization: Bearer $TOKEN" || true)
EV_N=$(echo "$EVENTS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
if [ "${EV_N:-0}" -ge 1 ]; then
  ok "events list total=$EV_N"
else
  bad "events list empty"
fi

# 错误签名应 401
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/integrations/ingress/webhook?connector_id=$CID" \
  -H "Content-Type: application/json" \
  -H "X-BlockHub-Signature: sha256=deadbeef" \
  -d "$BODY" || echo 000)
if [ "$CODE" = "401" ]; then
  ok "bad signature rejected (401)"
else
  bad "bad signature should 401 (got $CODE)"
fi

# SSO start：未配置时应 503
SSO_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/auth/oauth/wecom/start" || echo 000)
if [ "$SSO_CODE" = "503" ] || [ "$SSO_CODE" = "200" ]; then
  ok "wecom oauth start responds ($SSO_CODE)"
else
  bad "wecom oauth start unexpected $SSO_CODE"
fi

echo ""
echo "pass=$pass fail=$fail"
if [ "$fail" -gt 0 ]; then
  exit 1
fi
echo "ALL PASS"
