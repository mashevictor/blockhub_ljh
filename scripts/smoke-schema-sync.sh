#!/usr/bin/env bash
# 改页审批状态同步冒烟：提交 pending → 管理员直接发布 → pending 必须关闭
#
# 用法:
#   bash scripts/smoke-schema-sync.sh
#   bash scripts/smoke-schema-sync.sh https://blockhub.club
#   bash scripts/smoke-schema-sync.sh http://127.0.0.1:8001
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
BASE="${BASE%/}"
if [[ "$BASE" == *"/api/v1" ]]; then
  API="$BASE"
else
  API="$BASE/api/v1"
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

PASS=0
FAIL=0
ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "=========================================="
echo " Schema approval sync smoke · $API"
echo "=========================================="

login() {
  curl -sS --max-time 20 -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo ""
}

TOKEN=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
if [[ -z "$TOKEN" ]]; then
  curl -sf -X POST "$API/auth/demo-bootstrap" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 || true
  TOKEN=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
fi
[[ -n "$TOKEN" ]] && ok "admin login" || { bad "admin login"; exit 1; }

AUTH=( -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" )

# 发布一个最小应用
PUB=$(curl -sS --max-time 90 -X POST "$API/creation/publish" "${AUTH[@]}" -d '{
  "name": "Smoke Schema Sync",
  "industry_key": "office",
  "capability_keys": ["inventory_count", "approval_inbox"],
  "modules": [
    {"key": "inventory_count", "label": "库存盘点", "kind": "module"},
    {"key": "approval_inbox", "label": "审批待办", "kind": "module"}
  ],
  "deliver": "web",
  "source": "prompt",
  "assemble_full_scenes": false
}')
APP=$(echo "$PUB" | python3 -c "import sys,json; print((json.load(sys.stdin).get('app') or {}).get('id',''))" 2>/dev/null || echo "")
[[ -n "$APP" ]] && ok "publish app=$APP" || { bad "publish"; echo "$PUB" | head -c 300; exit 1; }

SCHEMA=$(curl -sS --max-time 20 "$API/runtime/$APP/schema" "${AUTH[@]}")
REV=$(echo "$SCHEMA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('schema_rev',1))" 2>/dev/null || echo 1)
PS=$(echo "$SCHEMA" | python3 -c "import sys,json; import json as J; d=json.load(sys.stdin); print(J.dumps(d.get('page_schema') or {}, ensure_ascii=False))" 2>/dev/null)

# 保存草稿
DRAFT_BODY=$(python3 - <<PY
import json
ps = json.loads('''$PS''')
ps['title'] = (ps.get('title') or 'Smoke') + ' · draft sync'
print(json.dumps({"page_schema": ps, "summary": "smoke draft for sync test"}, ensure_ascii=False))
PY
)
DRAFT=$(curl -sS --max-time 30 -X POST "$API/runtime/$APP/schema/changes" "${AUTH[@]}" -d "$DRAFT_BODY")
CID=$(echo "$DRAFT" | python3 -c "import sys,json; print((json.load(sys.stdin).get('change') or {}).get('id',''))" 2>/dev/null || echo "")
[[ -n "$CID" ]] && ok "draft change_id=$CID" || { bad "draft"; echo "$DRAFT" | head -c 300; exit 1; }

# 提交审批 → pending
SUB=$(curl -sS --max-time 30 -X POST "$API/runtime/$APP/schema/changes/submit" "${AUTH[@]}" \
  -d "{\"change_id\":\"$CID\"}")
ST=$(echo "$SUB" | python3 -c "import sys,json; print((json.load(sys.stdin).get('change') or {}).get('status',''))" 2>/dev/null || echo "")
[[ "$ST" == "pending" ]] && ok "submitted → pending" || bad "submit status=$ST"

# 管理员直接发布（应关闭 pending）
PATCH_BODY=$(python3 - <<PY
import json
ps = json.loads('''$PS''')
ps['title'] = (ps.get('title') or 'Smoke') + ' · direct publish'
print(json.dumps({
  "page_schema": ps,
  "base_rev": int("$REV"),
  "force": True,
  "source": "admin_direct",
  "direct_publish": True,
}, ensure_ascii=False))
PY
)
PATCH=$(curl -sS --max-time 30 -X PATCH "$API/runtime/$APP/schema" "${AUTH[@]}" -d "$PATCH_BODY")
NEW_REV=$(echo "$PATCH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('schema_rev',''))" 2>/dev/null || echo "")
SUP=$(echo "$PATCH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('superseded_changes',0))" 2>/dev/null || echo "0")
[[ -n "$NEW_REV" ]] && ok "direct publish → v$NEW_REV (superseded=$SUP)" || bad "direct publish"

# 列表中不应再有 pending
LIST=$(curl -sS --max-time 20 "$API/runtime/$APP/schema/changes" "${AUTH[@]}")
PENDING_N=$(echo "$LIST" | python3 -c "
import sys,json
items=json.load(sys.stdin).get('items') or []
print(sum(1 for c in items if c.get('status')=='pending'))
" 2>/dev/null || echo 99)
[[ "$PENDING_N" == "0" ]] && ok "no pending left after direct publish" || bad "still $PENDING_N pending"

# 该 change 应变 cancelled
CST=$(echo "$LIST" | python3 -c "
import sys,json
items=json.load(sys.stdin).get('items') or []
cid='$CID'
for c in items:
  if c.get('id')==cid:
    print(c.get('status','')); break
else:
  print('missing')
" 2>/dev/null || echo "?")
[[ "$CST" == "cancelled" ]] && ok "change $CID → cancelled" || bad "change status=$CST (want cancelled)"

echo "=========================================="
echo " RESULT · pass=$PASS fail=$FAIL"
echo "=========================================="
[[ "$FAIL" -eq 0 ]]
