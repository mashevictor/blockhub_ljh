#!/usr/bin/env bash
# Batch A + 行业预览 / 真发布 · 服务器冒烟验证
#
# 用法（在仓库根或 ~/blockhub）:
#   # 完整站（API + 前端 SPA）— 推荐验收
#   bash scripts/smoke-batch-a.sh https://blockhub.club
#
#   # 仅 API（uvicorn :8001）— 跳过 SPA 预览路由，不报假失败
#   bash scripts/smoke-batch-a.sh http://127.0.0.1:8001
#
#   # API 与站点分离时
#   SITE_WEB=https://blockhub.club bash scripts/smoke-batch-a.sh http://127.0.0.1:8001
#
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... bash scripts/smoke-batch-a.sh https://blockhub.club
#
# 登录失败时（生产站）:
#   cd ~/blockhub && bash scripts/repair-auth.sh
#   然后用 http://127.0.0.1:8001 或带正确密码再跑正式站
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

# SPA 站点根（预览页 /r/ 等）；默认同 SITE，可用 SITE_WEB 覆盖
SITE_WEB="${SITE_WEB:-$SITE}"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

PASS=0
FAIL=0
SKIP=0
ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
skip() { echo "  ○ skip $1"; SKIP=$((SKIP + 1)); }

# 判断是否「仅 API」：常见 :8001，或 /health 无而 /api 有
is_api_only() {
  case "$SITE" in
    *":8001"|*"127.0.0.1:8001"|*"localhost:8001") return 0 ;;
  esac
  return 1
}

echo "=========================================="
echo " Batch A Smoke · API=$API"
echo " SITE_WEB=$SITE_WEB"
echo "=========================================="

# ── health（多路径；API-only 用 openapi/docs 探测）──
health_ok=0
for u in \
  "$SITE/health" \
  "$SITE_WEB/health" \
  "$API/../health" \
  "http://127.0.0.1:8001/health"
do
  if curl -sf --max-time 5 "$u" >/dev/null 2>&1; then
    ok "health ($u)"
    health_ok=1
    break
  fi
done
if [[ "$health_ok" -eq 0 ]]; then
  # FastAPI 常挂 /docs 或 openapi
  if curl -sf --max-time 5 "$API/openapi.json" >/dev/null 2>&1 \
    || curl -sf --max-time 5 "${API%/api/v1}/docs" >/dev/null 2>&1 \
    || curl -sf --max-time 5 -o /dev/null -w "" -X POST "$API/auth/login" \
         -H "Content-Type: application/json" -d '{}' 2>/dev/null; then
    ok "API reachable (no /health endpoint — OK for API-only)"
  else
    bad "health / API unreachable"
  fi
fi

login_once() {
  curl -sf --max-time 15 -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo ""
}

login_diag() {
  echo "  login POST $API/auth/login as $ADMIN_EMAIL"
  local code body
  code=$(curl -sS --max-time 15 -o /tmp/smoke_batch_a_login.json -w "%{http_code}" -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" || echo "000")
  body=$(head -c 400 /tmp/smoke_batch_a_login.json 2>/dev/null || true)
  echo "  HTTP $code body=${body}"
  if [[ "$code" == "401" ]]; then
    echo "  hint: 生产站密码可能已改。在服务器执行:"
    echo "        cd ~/blockhub && bash scripts/repair-auth.sh"
    echo "        再: bash scripts/smoke-batch-a.sh http://127.0.0.1:8001"
    echo "        或: ADMIN_PASSWORD=实际密码 bash scripts/smoke-batch-a.sh https://blockhub.club"
  fi
}

TOKEN=$(login_once)
if [[ -z "$TOKEN" ]]; then
  curl -sf --max-time 15 -X POST "$API/auth/demo-bootstrap" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 || true
  TOKEN=$(login_once)
fi
if [[ -n "$TOKEN" ]]; then
  ok "login"
else
  bad "login"
  login_diag
  echo "FAIL=$FAIL PASS=$PASS SKIP=$SKIP"
  exit 1
fi

AUTH=( -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" )

# ── ops_kpi 真写入 ──
OPS_BODY=$(python3 - <<'PY'
import json, time
print(json.dumps({
  "category": "ops",
  "title": f"smoke-kpi-{int(time.time())}",
  "period": "2026-07",
  "value": "1",
  "note": "batch-a",
  "app_public_id": "smoke-batch-a",
}))
PY
)
OPS_CREATE=$(curl -sf --max-time 30 -X POST "$API/ops-kpi/records" "${AUTH[@]}" -d "$OPS_BODY" || echo "")
OPS_ID=$(echo "$OPS_CREATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('record') or {}).get('id',''))" 2>/dev/null || echo "")
if [[ -n "$OPS_ID" ]]; then
  ok "ops_kpi create id=$OPS_ID"
  curl -sf --max-time 15 -X POST "$API/ops-kpi/records/$OPS_ID/published" "${AUTH[@]}" -d '{}' >/dev/null && ok "ops_kpi publish" || bad "ops_kpi publish"
  curl -sf --max-time 15 -X POST "$API/ops-kpi/records/$OPS_ID/archived" "${AUTH[@]}" -d '{}' >/dev/null && ok "ops_kpi archive" || bad "ops_kpi archive"
else
  bad "ops_kpi create"
fi
OPS_LIST=$(curl -sf --max-time 15 "$API/ops-kpi/records?app_id=smoke-batch-a" "${AUTH[@]}" || echo "")
echo "$OPS_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'items' in d" 2>/dev/null && ok "ops_kpi list" || bad "ops_kpi list"

# ── 只读真 API（空库可空）──
curl -sf --max-time 15 "$API/kb/stats" "${AUTH[@]}" >/dev/null && ok "kb/stats" || bad "kb/stats"
curl -sf --max-time 15 "$API/notifications" "${AUTH[@]}" >/dev/null && ok "notifications" || bad "notifications"
curl -sf --max-time 15 "$API/integrations" "${AUTH[@]}" >/dev/null && ok "integrations" || bad "integrations"
curl -sf --max-time 15 "$API/stats/dashboard" "${AUTH[@]}" >/dev/null && ok "stats/dashboard" || bad "stats/dashboard"

NL=$(curl -sf --max-time 60 -X POST "$API/reports/nl-query" "${AUTH[@]}" \
  -d '{"question":"待审批有多少？"}' || echo "")
echo "$NL" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null && ok "reports/nl-query" || bad "reports/nl-query"

# ── 预览相关真 API 列表 ──
for path in \
  "policy-qa/records" \
  "legal-case/records" \
  "leave-request/records" \
  "expense-claim/records" \
  "mfg-ops/mfg_oee/records"
do
  curl -sf --max-time 15 "$API/$path" "${AUTH[@]}" >/dev/null && ok "GET $path" || bad "GET $path"
done

# ── 行业真发布 → /r/{id} ──
PUB_BODY=$(python3 - <<PY
import json
print(json.dumps({
  "name": "Smoke BatchA Industry",
  "industry_key": "office",
  "scenario_ids": ["o1", "o2"],
  "scenario_names": ["制度政策问答", "请假申请"],
  "capability_keys": ["policy_qa", "leave_request", "ops_kpi"],
  "modules": [
    {"key": "office", "label": "通用办公", "kind": "industry", "icon_key": "office", "source": "user"},
    {"key": "policy_qa", "label": "制度问答", "kind": "module", "icon_key": "creation", "source": "auto"},
    {"key": "leave_request", "label": "请假", "kind": "module", "icon_key": "creation", "source": "auto"},
    {"key": "ops_kpi", "label": "运营看板", "kind": "module", "icon_key": "creation", "source": "auto"},
  ],
  "audience": "both",
  "deliver": "web",
  "source": "industry",
  "prompt": "",
  "contact_email": "",
  "contact_phone": "",
  "icon_url": "",
  "primary_color": "#4338ca",
  "web_template_id": "tabs_portal",
  "app_ui_id": "bottom_tabs",
  "assemble_full_scenes": False,
}, ensure_ascii=False))
PY
)
PUB_OUT=$(curl -sf --max-time 90 -X POST "$API/creation/publish" "${AUTH[@]}" -d "$PUB_BODY" || echo "")
APP_ID=$(echo "$PUB_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('app') or {}).get('id',''))" 2>/dev/null || echo "")

if [[ -n "$APP_ID" && "$APP_ID" != cache-* ]]; then
  ok "creation/publish app_id=$APP_ID (not cache-*)"
else
  bad "creation/publish (got app_id=${APP_ID:-empty})"
fi

if [[ -n "$APP_ID" ]]; then
  CODE=$(curl -sS --max-time 15 -o /dev/null -w "%{http_code}" "$SITE_WEB/r/$APP_ID" || echo "000")
  if [[ "$CODE" == "200" || "$CODE" == "301" || "$CODE" == "302" ]]; then
    ok "GET $SITE_WEB/r/$APP_ID → HTTP $CODE"
  else
    SCHEMA=$(curl -sf --max-time 15 "$API/runtime/$APP_ID/schema" "${AUTH[@]}" 2>/dev/null \
      || curl -sf --max-time 15 "$API/creation/apps/$APP_ID" "${AUTH[@]}" 2>/dev/null \
      || echo "")
    if [[ -n "$SCHEMA" ]]; then
      ok "runtime schema for $APP_ID (SPA /r 未测或 API-only)"
    else
      bad "GET /r/$APP_ID HTTP $CODE (and no schema)"
    fi
  fi
  echo "$PUB_OUT" | python3 -c '
import sys, json
d = json.load(sys.stdin)
asm = d.get("capability_assembly") or (d.get("app") or {}).get("capability_assembly") or {}
req = set(asm.get("requested_keys") or [])
res = set(asm.get("resolved_keys") or [])
print(f"requested={len(req)} resolved={len(res)}")
if len(res) > 25:
    raise SystemExit(1)
' && ok "assemble_full_scenes=false (keys bounded)" || bad "capability assembly too wide"
fi

# ── 预览页 SPA 路由（仅完整站）──
check_spa_preview() {
  local path="$1"
  local code
  code=$(curl -sS --max-time 15 -o /dev/null -w "%{http_code}" "$SITE_WEB$path" || echo "000")
  if [[ "$code" == "200" ]]; then
    ok "GET $SITE_WEB$path → 200"
  elif is_api_only && [[ "$SITE_WEB" == "$SITE" ]]; then
    skip "$path (API-only :8001 无 SPA；用 SITE_WEB=https://blockhub.club 或对正式站跑)"
  else
    bad "GET $SITE_WEB$path → HTTP $code"
  fi
}

check_spa_preview "/preview/industry-runtime/office"
check_spa_preview "/preview/industry-runtime/mfg"

echo "=========================================="
echo " RESULT · pass=$PASS fail=$FAIL skip=$SKIP"
echo "=========================================="
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
