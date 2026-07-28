#!/usr/bin/env bash
# BlockHub 管理后台 API 检查（接口可用性 + 响应耗时）
#
# 用法:
#   bash scripts/smoke-admin-api.sh                          # 本机 API :8001
#   bash scripts/smoke-admin-api.sh http://124.222.177.43    # 经 Nginx
#   bash scripts/smoke-admin-api.sh http://127.0.0.1:8001    # 直连 API
#
# 环境变量:
#   ADMIN_EMAIL / ADMIN_PASSWORD   管理员账号（默认 admin@trackchat.local / admin123）
#   EMP_EMAIL / EMP_PASSWORD       员工账号（默认 employee@trackchat.local / emp123）
#   WARN_MS=1000  SLOW 阈值（毫秒）
#   FAIL_MS=3000  超时失败阈值（毫秒）
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
EMP_EMAIL="${EMP_EMAIL:-employee@trackchat.local}"
EMP_PASSWORD="${EMP_PASSWORD:-emp123}"

WARN_MS="${WARN_MS:-1000}"
FAIL_MS="${FAIL_MS:-3000}"

pass=0
fail=0
warn=0
total_ms=0
slowest_name=""
slowest_ms=0

TMP_BODY="$(mktemp /tmp/blockhub-admin-smoke.XXXXXX)"
trap 'rm -f "$TMP_BODY"' EXIT

ok()   { echo "  ✓ $1"; pass=$((pass + 1)); }
bad()  { echo "  ✗ $1"; fail=$((fail + 1)); }
note() { echo "  ! $1"; warn=$((warn + 1)); }

ms_to_int() {
  python3 -c "print(int(float('$1') * 1000))" 2>/dev/null || echo "0"
}

login_token() {
  local email="$1" password="$2"
  curl -sf -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo ""
}

# check_api <label> <method> <path> <token> <expect_regex> [curl_extra...]
check_api() {
  local label="$1" method="$2" path="$3" token="$4" expect="$5"
  shift 5

  local args=(-s -o "$TMP_BODY" -w "%{http_code} %{time_total}")
  if [ -n "$token" ]; then
    args+=(-H "Authorization: Bearer $token")
  fi
  if [ "$method" = "POST" ]; then
    args+=(-X POST -H "Content-Type: application/json")
  fi
  args+=("$@" "$API$path")

  local raw shell_ms=0
  if ! raw=$(curl "${args[@]}" 2>/dev/null); then
    bad "$label (no response)"
    return
  fi

  local code="${raw%% *}"
  local secs="${raw#* }"
  shell_ms=$(ms_to_int "$secs")
  total_ms=$((total_ms + shell_ms))

  if [ "$shell_ms" -gt "$slowest_ms" ]; then
    slowest_ms=$shell_ms
    slowest_name=$label
  fi

  local timing_tag=""
  if [ "$shell_ms" -ge "$FAIL_MS" ]; then
    timing_tag=" SLOW ${shell_ms}ms"
    bad "$label (HTTP $code, ${shell_ms}ms >= ${FAIL_MS}ms)"
    return
  elif [ "$shell_ms" -ge "$WARN_MS" ]; then
    timing_tag=" ${shell_ms}ms"
    note "$label (HTTP $code, ${shell_ms}ms — 偏慢)"
  else
    timing_tag=" ${shell_ms}ms"
  fi

  if [ "$code" != "200" ]; then
    bad "$label (HTTP $code${timing_tag})"
    return
  fi

  if [ -n "$expect" ]; then
    if grep -qE "$expect" "$TMP_BODY" 2>/dev/null; then
      ok "$label (HTTP 200${timing_tag})"
    else
      bad "$label (HTTP 200 but body mismatch${timing_tag})"
      head -c 200 "$TMP_BODY" 2>/dev/null | tr '\n' ' '
      echo ""
    fi
  else
    ok "$label (HTTP 200${timing_tag})"
  fi
}

echo "=========================================="
echo " BlockHub Admin API Check"
echo " Base: $BASE"
echo " API:  $API"
echo " Slow: warn>=${WARN_MS}ms  fail>=${FAIL_MS}ms"
echo "=========================================="

echo ""
echo "=== 1. 登录 ==="
ADMIN_TOKEN=$(login_token "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
EMP_TOKEN=$(login_token "$EMP_EMAIL" "$EMP_PASSWORD")

if [ -n "$ADMIN_TOKEN" ]; then ok "POST /auth/login (admin)"; else bad "POST /auth/login (admin)"; fi
if [ -n "$EMP_TOKEN" ]; then ok "POST /auth/login (employee)"; else bad "POST /auth/login (employee)"; fi

if [ -z "$ADMIN_TOKEN" ]; then
  echo ""
  echo "管理员登录失败，无法继续。请检查 API / 数据库 / seed。"
  exit 1
fi

echo ""
echo "=== 2. 布局加载（AdminLayout 首屏）==="
check_api "GET /auth/me"           GET  "/auth/me"              "$ADMIN_TOKEN" '"role"'
check_api "GET /stats/dashboard"   GET  "/stats/dashboard"      "$ADMIN_TOKEN" '"status_text"'
check_api "GET /catalog/summary"   GET  "/catalog/summary"      ""             '"total"'

echo ""
echo "=== 3. 工作台 OverviewPage ==="
check_api "GET /stats/activities"  GET  "/stats/activities"     "$ADMIN_TOKEN" '"items"'
check_api "GET /stats/trends"      GET  "/stats/trends"         "$ADMIN_TOKEN" '"chat_qa"'
check_api "GET /agents"            GET  "/agents"               "$ADMIN_TOKEN" '"items"'
check_api "GET /creation/apps"     GET  "/creation/apps"        "$ADMIN_TOKEN" '"items"'

echo ""
echo "=== 4. 能力中心 ==="
check_api "GET /catalog/modules"   GET  "/catalog/modules"      "$ADMIN_TOKEN" '"total"'

echo ""
echo "=== 5. 业务场景 ==="
check_api "GET /catalog/office"    GET  "/catalog/office?lite=true" "$ADMIN_TOKEN" '"items"'
check_api "GET /catalog/industry" GET "/catalog/industry?lite=true" "$ADMIN_TOKEN" '"items"'

echo ""
echo "=== 6. 智能问答 ==="
check_api "GET /chat/config"       GET  "/chat/config"          "$ADMIN_TOKEN" '"models"'
check_api "GET /chat/sessions/default/messages" GET "/chat/sessions/default/messages" "$ADMIN_TOKEN" '"items"'

echo ""
echo "=== 7. 知识库 ==="
check_api "GET /kb/stats"          GET  "/kb/stats"             "$ADMIN_TOKEN" '"documents"'
check_api "GET /kb/bases"          GET  "/kb/bases"             "$ADMIN_TOKEN" '"items"'
check_api "GET /kb/documents"      GET  "/kb/documents"         "$ADMIN_TOKEN" '"items"'

echo ""
echo "=== 8. 审批中心 ==="
check_api "GET /approvals/stats"   GET  "/approvals/stats"      "$ADMIN_TOKEN" '"pending"'
check_api "GET /approvals"         GET  "/approvals"            "$ADMIN_TOKEN" '"items"'

echo ""
echo "=== 9. 数据报表 ==="
check_api "GET /reports/dashboard" GET  "/reports/dashboard"    "$ADMIN_TOKEN" '"kpis"'

echo ""
echo "=== 10. 消息通知 ==="
check_api "GET /notifications"     GET  "/notifications"        "$ADMIN_TOKEN" '"items"'

echo ""
echo "=== 11. 合同盖章（管理员）==="
check_api "GET /contracts/config"  GET  "/contracts/config"      "$ADMIN_TOKEN" '"title"'
check_api "GET /contracts"         GET  "/contracts"             "$ADMIN_TOKEN" '"items"'

echo ""
echo "=== 12. 创建向导（管理员）==="
check_api "GET /creation/wizard"   GET  "/creation/wizard"      "$ADMIN_TOKEN" '"steps"'

echo ""
echo "=== 13. 员工角色抽检 ==="
if [ -n "$EMP_TOKEN" ]; then
  check_api "GET /auth/me (employee)" GET "/auth/me" "$EMP_TOKEN" '"employee"'
  check_api "GET /approvals (employee)" GET "/approvals" "$EMP_TOKEN" '"items"'
  check_api "GET /chat/config (employee)" GET "/chat/config" "$EMP_TOKEN" '"models"'
else
  note "skip employee checks (login failed)"
fi

echo ""
echo "=== 14. 首屏 3 接口耗时（串行）==="
_serial_ms=0
for path in "/auth/me" "/stats/dashboard" "/catalog/summary"; do
  raw=$(curl -sf -o /dev/null -w "%{time_total}" -H "Authorization: Bearer $ADMIN_TOKEN" "$API$path" 2>/dev/null || echo "9.999")
  _serial_ms=$((_serial_ms + $(ms_to_int "$raw")))
done
echo "  首屏 3 接口串行合计: ${_serial_ms}ms (优化前常见 >5000ms)"
if [ "$_serial_ms" -lt 3000 ]; then
  ok "首屏 API 总耗时 < 3s"
elif [ "$_serial_ms" -lt 8000 ]; then
  note "首屏 API 总耗时 ${_serial_ms}ms (建议 <3s)"
else
  bad "首屏 API 总耗时 ${_serial_ms}ms (过慢)"
fi

echo ""
echo "=========================================="
echo " Result: $pass passed, $fail failed, $warn warnings"
echo " Total API time (all checks): ${total_ms}ms"
if [ -n "$slowest_name" ]; then
  echo " Slowest: $slowest_name (${slowest_ms}ms)"
fi
echo "=========================================="

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
