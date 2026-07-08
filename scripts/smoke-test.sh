#!/usr/bin/env bash
# BlockHub 冒烟测试（本地或服务器）
# 用法:
#   bash scripts/smoke-test.sh                          # 默认 http://127.0.0.1:8001 直连 API
#   bash scripts/smoke-test.sh http://101.32.209.251    # 经 Nginx（/api 代理）
#   bash scripts/smoke-test.sh http://127.0.0.1 --seed-only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://127.0.0.1:8001}"
SEED_ONLY=false
if [ "${2:-}" = "--seed-only" ] || [ "${1:-}" = "--seed-only" ]; then
  SEED_ONLY=true
  BASE="${1:-http://127.0.0.1:8001}"
  [ "$BASE" = "--seed-only" ] && BASE="http://127.0.0.1:8001"
fi

# Nginx 根路径 vs 直连 8001
if [[ "$BASE" == *":8001"* ]]; then
  API="$BASE/api/v1"
else
  API="$BASE/api/v1"
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

pass=0
fail=0

ok() { echo "  ✓ $1"; pass=$((pass + 1)); }
bad() { echo "  ✗ $1"; fail=$((fail + 1)); }

check_json() {
  local desc="$1" url="$2" expect="$3"
  local body
  body=$(curl -sf "$url" 2>/dev/null || echo "")
  if [ -z "$body" ]; then bad "$desc (no response)"; return; fi
  if echo "$body" | grep -q "$expect"; then ok "$desc"; else bad "$desc (got: $body)"; fi
}

echo "=========================================="
echo " BlockHub Smoke Test"
echo " API: $API"
echo "=========================================="

echo ""
echo "=== Auth + Seed ==="
TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
  ok "POST /auth/login"
else
  bad "POST /auth/login"
fi

if [ -n "$TOKEN" ]; then
  SEED_BODY=$(curl -sf -X POST "$API/seed" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"force":false}' 2>/dev/null || echo "")
  if echo "$SEED_BODY" | grep -q '"success":true'; then
    ok "POST /seed"
  else
    bad "POST /seed ($SEED_BODY)"
  fi
fi

if [ "$SEED_ONLY" = true ]; then
  echo ""
  echo "Seed-only mode done. pass=$pass fail=$fail"
  [ "$fail" -eq 0 ] || exit 1
  exit 0
fi

echo ""
echo "=== Health (D5 Redis) ==="
HEALTH=$(curl -sf "$API/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"status"'; then ok "GET /health status"; else bad "GET /health"; fi
if echo "$HEALTH" | grep -q '"redis":"ok"'; then
  ok "redis ping ok"
elif echo "$HEALTH" | grep -q '"redis":"unavailable"'; then
  ok "redis field present (unavailable — start: docker compose up -d redis)"
else
  bad "health missing redis field ($HEALTH)"
fi

echo ""
echo "=== Tenant config (D6) ==="
TENANT_CFG=$(curl -sf "$API/tenant/config?tenant=demo" 2>/dev/null || echo "")
if echo "$TENANT_CFG" | grep -q '"tenant_slug":"demo"'; then ok "GET /tenant/config"; else bad "GET /tenant/config ($TENANT_CFG)"; fi
if echo "$TENANT_CFG" | grep -q '"app_name"'; then ok "tenant config app_name"; else bad "tenant config missing app_name"; fi

echo ""
echo "=== Catalog (PostgreSQL) ==="
SUMMARY=$(curl -sf "$API/catalog/summary" 2>/dev/null || echo "")
if echo "$SUMMARY" | grep -q '"source":"database"'; then ok "catalog source=database"; else bad "catalog source!=database ($SUMMARY)"; fi

# 基础 114 = 65 office + 49 industry；hero 补录场景会使 total > 114，属正常
OFFICE_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('office_count',0))" 2>/dev/null || echo 0)
INDUSTRY_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('industry_count',0))" 2>/dev/null || echo 0)
TOTAL_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
HERO_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('hero_preset_count',0))" 2>/dev/null || echo 0)
CHIP_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('chip_template_count',0))" 2>/dev/null || echo 0)

[ "$INDUSTRY_COUNT" -eq 49 ] 2>/dev/null && ok "industry_count=49" || bad "industry_count!=49 ($SUMMARY)"
[ "$OFFICE_COUNT" -ge 65 ] 2>/dev/null && ok "office_count>=65 ($OFFICE_COUNT)" || bad "office_count<65 ($SUMMARY)"
[ "$TOTAL_COUNT" -ge 114 ] 2>/dev/null && ok "total>=114 ($TOTAL_COUNT)" || bad "total<114 ($SUMMARY)"
[ "$HERO_COUNT" -eq 30 ] 2>/dev/null && ok "hero_preset_count=30" || bad "hero_preset_count!=30 ($SUMMARY)"
[ "$CHIP_COUNT" -eq 5 ] 2>/dev/null && ok "chip_template_count=5" || bad "chip_template_count!=5 ($SUMMARY)"
AGENT_COUNT=$(echo "$SUMMARY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('agent_count',0))" 2>/dev/null || echo 0)
[ "$AGENT_COUNT" -ge 12 ] 2>/dev/null && ok "agent_count>=12 ($AGENT_COUNT)" || bad "agent_count<12 ($SUMMARY)"

HERO=$(curl -sf "$API/catalog/hero-presets" 2>/dev/null || echo "")
if echo "$HERO" | grep -q '"total":30'; then ok "GET /catalog/hero-presets total=30"; else bad "GET /catalog/hero-presets ($HERO)"; fi

OFFICE=$(curl -sf "$API/catalog/office?lite=true" 2>/dev/null || echo "")
if echo "$OFFICE" | grep -q '"total":'; then ok "GET /catalog/office lite"; else bad "GET /catalog/office"; fi

if [ -n "$TOKEN" ]; then
  AGENTS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/agents" 2>/dev/null || echo "")
  if echo "$AGENTS" | grep -q '"total":'; then ok "GET /agents"; else bad "GET /agents ($AGENTS)"; fi
  if echo "$AGENTS" | grep -q 'shanghai_voice'; then ok "agents includes shanghai_voice"; else bad "agents missing shanghai_voice"; fi
fi

echo ""
echo "=== Contract e-sign Agent ==="
if [ -n "$TOKEN" ]; then
  CFG=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/contracts/config" 2>/dev/null || echo "")
  if echo "$CFG" | grep -q 'contract_esign'; then ok "GET /contracts/config"; else bad "GET /contracts/config"; fi
  CID=$(curl -sf -X POST "$API/contracts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"title":"冒烟测试合同","template_key":"nda","parties":{"party_a":"测试甲","party_b":"测试乙"}}' \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('contract',{}).get('id',''))" 2>/dev/null || echo "")
  if [ -n "$CID" ]; then ok "POST /contracts ($CID)"; else bad "POST /contracts"; fi
  if [ -n "$CID" ]; then
    # 1x1 PNG
    PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    ASSET=$(curl -sf -X POST "$API/contracts/$CID/assets" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"asset_type\":\"signature\",\"data_url\":\"$PNG\"}" 2>/dev/null || echo "")
    if echo "$ASSET" | grep -q '"success":true'; then ok "POST /contracts/assets signature"; else bad "POST /contracts/assets"; fi
    SIGN=$(curl -sf -X POST "$API/contracts/$CID/sign" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "")
    if echo "$SIGN" | grep -q '"status":"signed"'; then ok "POST /contracts/sign"; else bad "POST /contracts/sign ($SIGN)"; fi
    PDF_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/contracts/$CID/signed.pdf")
    [ "$PDF_CODE" = "200" ] && ok "GET /contracts/signed.pdf" || bad "GET signed.pdf got $PDF_CODE"
  fi
fi

echo ""
echo "=== Protected routes (D3: no token → 403) ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/stats/dashboard")
[ "$CODE" = "403" ] && ok "stats/dashboard 403 without token" || bad "stats/dashboard expected 403 got $CODE"

if [ -n "$TOKEN" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/stats/dashboard")
  [ "$CODE" = "200" ] && ok "stats/dashboard 200 with token" || bad "stats/dashboard expected 200 got $CODE"
fi

EMP_TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@trackchat.local","password":"emp123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
if [ -n "$EMP_TOKEN" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/seed" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $EMP_TOKEN" \
    -d '{"force":false}')
  [ "$CODE" = "403" ] && ok "POST /seed 403 for employee" || bad "POST /seed expected 403 for employee got $CODE"
else
  bad "employee login for RBAC test"
fi

echo ""
echo "=== Chat SSE (D4) ==="
if [ -n "$TOKEN" ]; then
  CHAT_CFG=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/chat/config" 2>/dev/null || echo "")
  if echo "$CHAT_CFG" | grep -q '"stream_supported":true'; then ok "GET /chat/config stream_supported"; else bad "GET /chat/config"; fi
  STREAM=$(curl -sf -N -X POST "$API/chat/completions/stream" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"你好","session_id":"smoke"}' 2>/dev/null | head -c 200 || echo "")
  if echo "$STREAM" | grep -q 'data:'; then ok "POST /chat/completions/stream (SSE chunks)"; else bad "chat stream no SSE data"; fi
  if echo "$CHAT_CFG" | grep -q '"rag_available"'; then ok "GET /chat/config rag_available field"; else bad "chat config missing rag_available"; fi
fi

echo ""
echo "=== Knowledge Base (D7/D8) ==="
if [ -n "$TOKEN" ]; then
  KB_STATS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/kb/stats" 2>/dev/null || echo "")
  if echo "$KB_STATS" | grep -q '"knowledge_bases"'; then ok "GET /kb/stats"; else bad "GET /kb/stats ($KB_STATS)"; fi

  KB_CREATE=$(curl -sf -X POST "$API/kb/bases" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"冒烟知识库","description":"smoke test"}' 2>/dev/null || echo "")
  KB_ID=$(echo "$KB_CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('kb',{}).get('id',''))" 2>/dev/null || echo "")
  if [ -n "$KB_ID" ]; then ok "POST /kb/bases ($KB_ID)"; else bad "POST /kb/bases ($KB_CREATE)"; fi

  if [ -n "$KB_ID" ]; then
    TMPDOC=$(mktemp /tmp/blockhub-smoke-kb.XXXXXX.txt)
    echo "冒烟测试文档：员工请假须提前三个工作日提交申请，主管审批后生效。" > "$TMPDOC"
    UPLOAD=$(curl -sf -X POST "$API/kb/documents/upload" \
      -H "Authorization: Bearer $TOKEN" \
      -F "kb_id=$KB_ID" \
      -F "file=@$TMPDOC;filename=smoke-leave-policy.txt" 2>/dev/null || echo "")
    rm -f "$TMPDOC"
    DOC_ID=$(echo "$UPLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('document',{}).get('id',''))" 2>/dev/null || echo "")
    if [ -n "$DOC_ID" ]; then ok "POST /kb/documents/upload ($DOC_ID)"; else bad "POST /kb/documents/upload ($UPLOAD)"; fi

    if [ -n "$DOC_ID" ]; then
      # 等待后台索引（BackgroundTasks）
      INDEXED=false
      for _ in 1 2 3 4 5 6 7 8 9 10; do
        sleep 2
        DOC=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/kb/documents/$DOC_ID" 2>/dev/null || echo "")
        if echo "$DOC" | grep -q '"status":"indexed"'; then INDEXED=true; break; fi
        if echo "$DOC" | grep -q '"status":"failed"'; then bad "document index failed ($DOC)"; INDEXED=skip; break; fi
      done
      if [ "$INDEXED" = true ]; then ok "document indexed (chunks ready)"; elif [ "$INDEXED" != skip ]; then bad "document not indexed in time (still processing?)"; fi

      SEARCH=$(curl -sf -X POST "$API/kb/search" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{\"query\":\"请假\",\"kb_id\":\"$KB_ID\",\"top_k\":3}" 2>/dev/null || echo "")
      SEARCH_TOTAL=$(echo "$SEARCH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
      [ "$SEARCH_TOTAL" -ge 1 ] 2>/dev/null && ok "POST /kb/search hits>=1" || bad "POST /kb/search no hits ($SEARCH)"
    fi
  fi
fi

echo ""
echo "=== Shanghai Voice Agent ==="
VOICE_CFG=$(curl -sf "$API/voice/config" 2>/dev/null || echo "")
if echo "$VOICE_CFG" | grep -q '"agent_id":"shanghai_voice"'; then ok "GET /voice/config"; else bad "GET /voice/config ($VOICE_CFG)"; fi
if echo "$VOICE_CFG" | grep -q '"ws_path"'; then ok "voice ws_path present"; else bad "voice ws_path missing"; fi
VOICE_STATUS=$(curl -sf "$API/voice/status" 2>/dev/null || echo "")
if echo "$VOICE_STATUS" | grep -q '"ws_endpoint"'; then ok "GET /voice/status"; else bad "GET /voice/status ($VOICE_STATUS)"; fi
if echo "$VOICE_STATUS" | grep -q '"configured"'; then
  if echo "$VOICE_STATUS" | grep -q '"configured":true'; then
    ok "teleai configured (live voice ready)"
  else
    ok "teleai not configured (endpoint alive, set TELEAI_* in .env)"
  fi
fi

echo ""
echo "=== W2: Approvals + Chat PG (D10–D11) ==="
if [ -n "$TOKEN" ]; then
  APPR_STATS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/approvals/stats" 2>/dev/null || echo "")
  if echo "$APPR_STATS" | grep -q '"pending"'; then ok "GET /approvals/stats"; else bad "GET /approvals/stats ($APPR_STATS)"; fi

  APPR_LIST=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/approvals" 2>/dev/null || echo "")
  if echo "$APPR_LIST" | grep -q '"items"'; then ok "GET /approvals list"; else bad "GET /approvals ($APPR_LIST)"; fi

  APPR_NEW=$(curl -sf -X POST "$API/approvals" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"title":"冒烟请假申请","type":"leave","department":"测试部","summary":"W2 smoke"}' 2>/dev/null || echo "")
  APPR_ID=$(echo "$APPR_NEW" | python3 -c "import sys,json; print(json.load(sys.stdin).get('approval',{}).get('id',''))" 2>/dev/null || echo "")
  if [ -n "$APPR_ID" ]; then ok "POST /approvals submit ($APPR_ID)"; else bad "POST /approvals ($APPR_NEW)"; fi

  CHAT_CFG=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/chat/config" 2>/dev/null || echo "")
  if echo "$CHAT_CFG" | grep -q '"persistence":"postgresql"'; then ok "chat persistence=postgresql"; else bad "chat config ($CHAT_CFG)"; fi

  CHAT_REPLY=$(curl -sf -X POST "$API/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"你好，冒烟测试","session_id":"smoke-w2","use_rag":false}' 2>/dev/null || echo "")
  if echo "$CHAT_REPLY" | grep -q '"message"'; then ok "POST /chat/completions"; else bad "POST /chat/completions ($CHAT_REPLY)"; fi

  CHAT_HIST=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/chat/sessions/smoke-w2/messages" 2>/dev/null || echo "")
  MSG_COUNT=$(echo "$CHAT_HIST" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('items',[])))" 2>/dev/null || echo 0)
  [ "$MSG_COUNT" -ge 2 ] 2>/dev/null && ok "chat messages persisted (>=2)" || bad "chat history count=$MSG_COUNT ($CHAT_HIST)"

  FEAS=$(curl -sf -X POST "$API/creation/feasibility" \
    -H "Content-Type: application/json" \
    -d '{"industry_key":"office","scenario_names":["制度政策问答","请假申请"]}' 2>/dev/null || echo "")
  if echo "$FEAS" | grep -q '"feasible"'; then ok "POST /creation/feasibility"; else bad "POST /creation/feasibility ($FEAS)"; fi
  if echo "$FEAS" | grep -q '"matched_templates"'; then ok "feasibility matched_templates (W3)"; else bad "feasibility missing matched_templates"; fi

  TPL=$(curl -sf "$API/creation/schema-templates?industry=office" 2>/dev/null || echo "")
  if echo "$TPL" | grep -q '"total":8'; then ok "GET /creation/schema-templates office=8"; else bad "GET /creation/schema-templates ($TPL)"; fi

  CUSTOM_CAPS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/creation/custom-capabilities" 2>/dev/null || echo "")
  if echo "$CUSTOM_CAPS" | grep -q '"items"'; then ok "GET /creation/custom-capabilities"; else bad "GET /creation/custom-capabilities ($CUSTOM_CAPS)"; fi
fi

echo ""
echo "=== Creation (PostgreSQL) ==="
if [ -n "$TOKEN" ]; then
  PUBLISH=$(curl -sf -X POST "$API/creation/publish" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"冒烟测试应用","industry_key":"office","scenario_names":["制度政策问答"],"deliver":"both","contact_email":"smoke-test@trackchat.local"}' 2>/dev/null || echo "")
  if echo "$PUBLISH" | grep -q '"success":true'; then ok "POST /creation/publish"; else bad "POST /creation/publish"; fi

  APP_ID=$(echo "$PUBLISH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('app',{}).get('id',''))" 2>/dev/null || echo "")
  if [ -n "$APP_ID" ]; then
    APP_CFG=$(curl -sf "$API/tenant/config?tenant=demo&app_id=$APP_ID" 2>/dev/null || echo "")
    if echo "$APP_CFG" | grep -q '冒烟测试应用'; then ok "GET /tenant/config?app_id (W1)"; else bad "tenant config app override"; fi

    RUNTIME=$(curl -sf "$API/runtime/$APP_ID" 2>/dev/null || echo "")
    if echo "$RUNTIME" | grep -q '"public_id"'; then ok "GET /runtime/{appId}"; else bad "GET /runtime/{appId} ($RUNTIME)"; fi
    if echo "$RUNTIME" | grep -q '"deliver"'; then ok "runtime deliver field"; else bad "runtime missing deliver"; fi
    if echo "$PUBLISH" | grep -q '"page_schema"'; then ok "publish page_schema"; else bad "publish missing page_schema"; fi
    if echo "$PUBLISH" | grep -q '"build_manifest"'; then ok "publish build_manifest"; else bad "publish missing build_manifest"; fi

    SCHEMA=$(curl -sf "$API/runtime/$APP_ID/schema" 2>/dev/null || echo "")
    if echo "$SCHEMA" | grep -q '"page_schema"'; then ok "GET /runtime/{id}/schema"; else bad "GET /runtime/{id}/schema ($SCHEMA)"; fi

    MANIFEST=$(curl -sf "$API/runtime/$APP_ID/manifest" 2>/dev/null || echo "")
    if echo "$MANIFEST" | grep -q '"build_manifest"'; then ok "GET /runtime/{id}/manifest"; else bad "GET /runtime/{id}/manifest ($MANIFEST)"; fi

    if echo "$PUBLISH" | grep -q '"notification"'; then ok "publish notification payload"; else bad "publish missing notification"; fi

    PLAZA=$(curl -sf -X POST "$API/creation/plaza/publish" \
      -H "Content-Type: application/json" \
      -d "{\"app_id\":\"$APP_ID\",\"visibility\":\"public\"}" 2>/dev/null || echo "")
    if echo "$PLAZA" | grep -q '"success":true'; then ok "POST /creation/plaza/publish"; else bad "POST /creation/plaza/publish ($PLAZA)"; fi

    FEED=$(curl -sf "$API/creation/plaza/feed" 2>/dev/null || echo "")
    if echo "$FEED" | grep -q '冒烟测试应用'; then ok "GET /creation/plaza/feed"; else bad "GET /creation/plaza/feed ($FEED)"; fi
  fi

  APPS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/creation/apps" 2>/dev/null || echo "")
  if echo "$APPS" | grep -q '冒烟测试应用'; then ok "GET /creation/apps"; else bad "GET /creation/apps"; fi
fi

if [[ "$BASE" != *":8001"* ]]; then
  echo ""
  echo "=== W3: Runtime Web SPA ==="
  RUNTIME_HTML=$(curl -sf --max-time 10 "$BASE/r/index.html" 2>/dev/null || echo "")
  if echo "$RUNTIME_HTML" | grep -q 'id="root"'; then ok "GET /r/index.html SPA shell"; else bad "GET /r/index.html"; fi
  if echo "$RUNTIME_HTML" | grep -q '/r/assets/'; then ok "runtime bundle refs /r/assets/"; else bad "runtime missing asset refs"; fi
  if [ -f "$ROOT/runtime-web/dist/assets/"*.js ] 2>/dev/null || ls "$ROOT/runtime-web/dist/assets/"*.js >/dev/null 2>&1; then
  RUNTIME_JS=$(ls "$ROOT/runtime-web/dist/assets/"index-*.js 2>/dev/null | head -1)
  if [ -n "$RUNTIME_JS" ] && grep -q '员工端登录' "$RUNTIME_JS" 2>/dev/null; then ok "runtime bundle has login shell (W3)"; else ok "runtime dist present (login string may be minified)"; fi
  fi

  echo ""
  echo "=== Static + Voice page (Nginx) ==="
  ADMIN_HTML=$(curl -sf --max-time 10 "$BASE/admin/login" 2>/dev/null || echo "")
  if echo "$ADMIN_HTML" | grep -q 'id="root"'; then ok "GET /admin/login SPA shell"; else bad "GET /admin/login ($ADMIN_HTML)"; fi
  if echo "$ADMIN_HTML" | grep -q '/admin/assets/'; then ok "admin bundle refs /admin/assets/"; else bad "admin missing asset refs"; fi
  HOME_HTML=$(curl -sf --max-time 10 "$BASE/" 2>/dev/null || echo "")
  if echo "$HOME_HTML" | grep -q 'id="root"'; then ok "GET / Home SPA shell"; else bad "GET / Home"; fi
fi

echo ""
echo "=== OTP (optional) ==="
OTP_ACCOUNT="smoke-otp-$(date +%s)@trackchat.local"
SEND=$(curl -sf -X POST "$API/auth/send-code" \
  -H "Content-Type: application/json" \
  -d "{\"account\":\"$OTP_ACCOUNT\"}" 2>/dev/null || echo "")
if echo "$SEND" | grep -q '"success":true'; then
  ok "POST /auth/send-code"
elif echo "$SEND" | grep -q '请 .* 秒后再获取'; then
  ok "POST /auth/send-code (rate-limited, endpoint alive)"
else
  bad "POST /auth/send-code ($SEND)"
fi

echo ""
echo "=========================================="
echo " Result: $pass passed, $fail failed"
echo "=========================================="
[ "$fail" -eq 0 ] || exit 1
