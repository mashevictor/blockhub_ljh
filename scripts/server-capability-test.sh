#!/usr/bin/env bash
# 服务器能力链路一键验收（部署后执行）
#
# 用法:
#   bash scripts/server-capability-test.sh
#   bash scripts/server-capability-test.sh http://124.222.177.43
#   WITH_APK_BUILD=1 bash scripts/server-capability-test.sh http://127.0.0.1:8001
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"
PASS=0
FAIL=0
WARN=0

ok()  { echo "  ✓ $1"; PASS=$((PASS + 1)); }
no()  { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
warn(){ echo "  · $1"; WARN=$((WARN + 1)); }

run() {
  local name="$1"
  shift
  echo ""
  echo "=== $name ==="
  if "$@"; then
    ok "$name"
  else
    no "$name"
  fi
}

echo "=============================================="
echo " Server Capability E2E · $BASE"
echo " $(date '+%Y-%m-%d %H:%M %Z' 2>/dev/null || date)"
echo "=============================================="

# 1. 基础健康 + 登录
echo ""
echo "=== Health + Auth ==="
if curl -sf --max-time 8 "$API/health" | grep -q '"status"'; then
  ok "GET /health"
else
  no "GET /health"
fi

if bash "$ROOT/scripts/smoke-test.sh" "$BASE" --seed-only; then
  ok "smoke-test --seed-only"
else
  no "smoke-test --seed-only"
fi

# 2. 契约对齐
run "capability contract" bash "$ROOT/scripts/smoke-capability-contract.sh" "$BASE"

# 3. W5 runtime 契约
run "smoke-w5" bash "$ROOT/scripts/smoke-w5.sh" "$BASE"

# 4. Web 包物理存在性（manifest 常见包）
echo ""
echo "=== Web package inventory ==="
PKGS=$(ls -1 "$ROOT/packages" 2>/dev/null | grep '^web-capability-' | wc -l | tr -d ' ')
if [ "${PKGS:-0}" -ge 8 ] 2>/dev/null; then
  ok "web-capability packages ($PKGS dirs)"
else
  no "web-capability packages count ($PKGS)"
fi
for pkg in web-capability-integration web-capability-multi-agent web-capability-data-nl-query; do
  if [ -f "$ROOT/packages/$pkg/src/index.ts" ]; then
    ok "package $pkg"
  else
    no "package $pkg missing"
  fi
done

# 5. 集成类能力发布 + manifest
echo ""
echo "=== Integration publish ==="
TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trackchat.local","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
if [ -n "$TOKEN" ]; then
  PUB=$(curl -sf -X POST "$API/creation/publish" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name":"集成能力验收",
      "industry_key":"office",
      "capability_keys":["erp_connector","meeting_booking","it_helpdesk","chat_qa"],
      "deliver":"web",
      "source":"industry"
    }' 2>/dev/null || echo "")
  if [ -n "$PUB" ]; then
    ok "publish integration mix"
    echo "$PUB" | python3 -c '
import sys, json
d = json.load(sys.stdin)
m = d.get("build_manifest") or d.get("app", {}).get("build_manifest") or {}
pkgs = m.get("web_pkgs") or []
assert any("integration" in p for p in pkgs), pkgs
assert any("chat" in p for p in pkgs), pkgs
' && ok "manifest includes integration + chat" || no "integration manifest"
  else
    no "publish integration mix"
  fi
else
  no "login for integration publish"
fi

# 6. APK 语义
echo ""
echo "=== APK download semantics ==="
if [ "${WITH_APK_BUILD:-0}" = "1" ]; then
  export WITH_BUILD=1
fi
if bash "$ROOT/scripts/smoke-apk.sh" "$BASE"; then
  ok "smoke-apk"
else
  no "smoke-apk"
fi

# 7. runtime-web 构建产物
echo ""
echo "=== runtime-web build ==="
if [ -d "$ROOT/runtime-web/dist" ] && [ -f "$ROOT/runtime-web/dist/index.html" ]; then
  ok "runtime-web/dist present"
else
  warn "runtime-web/dist missing — run: cd runtime-web && npm run build"
fi

echo ""
echo "=============================================="
echo " Result: $PASS passed, $FAIL failed, $WARN warnings"
if [ "$FAIL" -eq 0 ]; then
  echo " ✅ Server capability E2E ready"
else
  echo " ⚠ Fix failed items above"
fi
echo " Full GA: bash scripts/ga-checklist.sh $BASE"
echo "=============================================="
[ "$FAIL" -eq 0 ]
