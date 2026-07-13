#!/usr/bin/env bash
# 发布契约冒烟：capability_assembly + manifest web_pkgs 对齐
set -u
BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"
PASS=0; FAIL=0
ok(){ echo "  ✓ $1"; PASS=$((PASS+1)); }
no(){ echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "=========================================="
echo " Capability Contract Smoke · $BASE"
echo "=========================================="

login_once() {
  curl -sf -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@trackchat.local","password":"admin123"}' \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo ""
}

TOKEN=$(login_once)
if [ -z "$TOKEN" ]; then
  curl -sf -X POST "$API/auth/demo-bootstrap" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 || true
  TOKEN=$(login_once)
fi
[ -n "$TOKEN" ] && ok "admin login" || { no "admin login"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

PUB=$(curl -sf -X POST "$API/creation/publish" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{
    "name":"契约对齐探测",
    "industry_key":"office",
    "scenario_names":["制度政策问答"],
    "capability_keys":["chat_qa","multi_agent","data_nl_query","unknown_cap_xyz"],
    "modules":[{"key":"approval_flow","label":"审批流"}],
    "deliver":"both",
    "source":"industry"
  }')

if [ -z "$PUB" ]; then no "publish"; exit 1; fi
ok "publish with mixed capability keys"

echo "$PUB" | python3 -c '
import sys, json
d = json.load(sys.stdin)
asm = d.get("capability_assembly") or d.get("app", {}).get("capability_assembly") or {}
resolved = asm.get("resolved_keys") or []
dropped = asm.get("dropped_keys") or []
assert "chat_qa" in resolved, resolved
assert "multi_agent" in resolved, resolved
assert "approval_flow" in resolved, resolved
assert "unknown_cap_xyz" in dropped, dropped
manifest = d.get("build_manifest") or d.get("app", {}).get("build_manifest") or {}
web_pkgs = manifest.get("web_pkgs") or []
assert any("multi-agent" in p for p in web_pkgs), web_pkgs
assert any("nl-query" in p or "chat" in p for p in web_pkgs), web_pkgs
print("assembly_ok", len(resolved), "resolved", len(dropped), "dropped")
' && ok "capability_assembly resolved/dropped" || no "capability_assembly mismatch"

APP_ID=$(echo "$PUB" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("app",{}).get("id",""))')
MANIFEST=$(curl -sf "$API/runtime/$APP_ID/manifest")
echo "$MANIFEST" | python3 -c '
import sys, json
m = json.load(sys.stdin)["build_manifest"]
keys = m.get("capability_keys") or []
assert "chat_qa" in keys and "multi_agent" in keys
assert "unknown_cap_xyz" not in keys
' && ok "runtime manifest keys match resolved" || no "runtime manifest keys"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/runtime/$APP_ID/download" 2>/dev/null || echo "000")
if [ "$CODE" = "503" ] || [ "$CODE" = "200" ]; then
  ok "download HTTP $CODE (503=per-app 未构建, 200=已就绪)"
else
  no "download HTTP $CODE (expected 503 or 200, no default.apk fallback)"
fi

echo ""
echo " Result: $PASS passed, $FAIL failed"
echo "=========================================="
[ "$FAIL" -eq 0 ]
