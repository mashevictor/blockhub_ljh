#!/usr/bin/env bash
# Batch A + 行业预览 / 真发布 · 服务器冒烟验证
#
# 用法（在仓库根或 ~/blockhub）:
#   bash scripts/smoke-batch-a.sh
#   bash scripts/smoke-batch-a.sh https://blockhub.club
#   bash scripts/smoke-batch-a.sh http://127.0.0.1:8001
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... bash scripts/smoke-batch-a.sh https://blockhub.club
#
# 覆盖：
#   - health / 登录
#   - ops_kpi 创建+列表+发布/归档
#   - kb/stats · notifications · integrations · stats/dashboard · reports/nl-query
#   - policy-qa / legal-case / mfg-ops 列表
#   - POST /creation/publish（industry · assemble_full_scenes=false）→ /r/{id} 可访问
#   - 预览页 /preview/industry-runtime/office|mfg HTTP 200
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
APP_TAG="smoke-batch-a"

PASS=0
FAIL=0
ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "=========================================="
echo " Batch A Smoke · $SITE"
echo "=========================================="

# ── health ──
if curl -sf "$SITE/health" >/dev/null 2>&1 || curl -sf "$SITE/api/v1/../health" >/dev/null 2>&1; then
  ok "health"
else
  # 部分部署只有 API 根
  if curl -sf "$API/auth/login" -o /dev/null -w "" -X OPTIONS 2>/dev/null; then
    ok "API reachable (no /health)"
  else
    bad "health / API unreachable"
  fi
fi

login_once() {
  curl -sf -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo ""
}

TOKEN=$(login_once)
if [[ -z "$TOKEN" ]]; then
  curl -sf -X POST "$API/auth/demo-bootstrap" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 || true
  TOKEN=$(login_once)
fi
if [[ -n "$TOKEN" ]]; then
  ok "login"
else
  bad "login (try: bash scripts/repair-auth.sh)"
  echo "FAIL=$FAIL PASS=$PASS"
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
OPS_CREATE=$(curl -sf -X POST "$API/ops-kpi/records" "${AUTH[@]}" -d "$OPS_BODY" || echo "")
OPS_ID=$(echo "$OPS_CREATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('record') or {}).get('id',''))" 2>/dev/null || echo "")
if [[ -n "$OPS_ID" ]]; then
  ok "ops_kpi create id=$OPS_ID"
  curl -sf -X POST "$API/ops-kpi/records/$OPS_ID/published" "${AUTH[@]}" -d '{}' >/dev/null && ok "ops_kpi publish" || bad "ops_kpi publish"
  curl -sf -X POST "$API/ops-kpi/records/$OPS_ID/archived" "${AUTH[@]}" -d '{}' >/dev/null && ok "ops_kpi archive" || bad "ops_kpi archive"
else
  bad "ops_kpi create"
fi
OPS_LIST=$(curl -sf "$API/ops-kpi/records?app_id=smoke-batch-a" "${AUTH[@]}" || echo "")
echo "$OPS_LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'items' in d" 2>/dev/null && ok "ops_kpi list" || bad "ops_kpi list"

# ── 只读真 API（空库可空）──
curl -sf "$API/kb/stats" "${AUTH[@]}" >/dev/null && ok "kb/stats" || bad "kb/stats"
curl -sf "$API/notifications" "${AUTH[@]}" >/dev/null && ok "notifications" || bad "notifications"
curl -sf "$API/integrations" "${AUTH[@]}" >/dev/null && ok "integrations" || bad "integrations"
curl -sf "$API/stats/dashboard" "${AUTH[@]}" >/dev/null && ok "stats/dashboard" || bad "stats/dashboard"

NL=$(curl -sf -X POST "$API/reports/nl-query" "${AUTH[@]}" \
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
  curl -sf "$API/$path" "${AUTH[@]}" >/dev/null && ok "GET $path" || bad "GET $path"
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
PUB_OUT=$(curl -sf -X POST "$API/creation/publish" "${AUTH[@]}" -d "$PUB_BODY" || echo "")
APP_ID=$(echo "$PUB_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('app') or {}).get('id',''))" 2>/dev/null || echo "")
WEB_URL=$(echo "$PUB_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('runtime') or {}).get('web_url') or (d.get('app') or {}).get('web_url',''))" 2>/dev/null || echo "")

if [[ -n "$APP_ID" && "$APP_ID" != cache-* ]]; then
  ok "creation/publish app_id=$APP_ID (not cache-*)"
else
  bad "creation/publish (got app_id=${APP_ID:-empty})"
fi

if [[ -n "$APP_ID" ]]; then
  # Runtime 页面（经站点）
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$SITE/r/$APP_ID" || echo "000")
  if [[ "$CODE" == "200" || "$CODE" == "301" || "$CODE" == "302" ]]; then
    ok "GET /r/$APP_ID → HTTP $CODE"
  else
    # 部分环境 SPA fallback 仍 200；schema API 更可靠
    SCHEMA=$(curl -sf "$API/runtime/$APP_ID/schema" "${AUTH[@]}" 2>/dev/null || curl -sf "$API/creation/apps/$APP_ID" "${AUTH[@]}" 2>/dev/null || echo "")
    if [[ -n "$SCHEMA" ]]; then
      ok "runtime schema for $APP_ID"
    else
      bad "GET /r/$APP_ID HTTP $CODE (and no schema)"
    fi
  fi
  # 禁止误装全量：解析 resolved_keys 应接近请求 keys
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

# ── 预览页静态路由 ──
for path in \
  "/preview/industry-runtime/office" \
  "/preview/industry-runtime/mfg"
do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$SITE$path" || echo "000")
  if [[ "$CODE" == "200" ]]; then
    ok "GET $path → 200"
  else
    bad "GET $path → HTTP $CODE"
  fi
done

echo "=========================================="
echo " RESULT · pass=$PASS fail=$FAIL"
echo "=========================================="
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
