#!/usr/bin/env bash
# 个人草稿单侧生效：作者 GET schema=personal_draft，他人/formal=正式版
#
# 用法:
#   bash scripts/smoke-personal-draft.sh
#   bash scripts/smoke-personal-draft.sh https://blockhub.club
#   bash scripts/smoke-personal-draft.sh http://127.0.0.1:8001
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
BASE="${BASE%/}"
API="$BASE/api/v1"
[[ "$BASE" == *"/api/v1" ]] && API="$BASE"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
EMP_EMAIL="${EMP_EMAIL:-employee@trackchat.local}"
EMP_PASSWORD="${EMP_PASSWORD:-emp123}"

PASS=0
FAIL=0
ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "=========================================="
echo " Personal draft Runtime smoke · $API"
echo "=========================================="

login() {
  curl -sS --max-time 20 -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo ""
}

AT=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
ET=$(login "$EMP_EMAIL" "$EMP_PASSWORD")
if [[ -z "$AT" || -z "$ET" ]]; then
  curl -sf -X POST "$API/auth/demo-bootstrap" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 || true
  AT=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
  ET=$(login "$EMP_EMAIL" "$EMP_PASSWORD")
fi
[[ -n "$AT" ]] && ok "admin login" || { bad "admin login"; exit 1; }
[[ -n "$ET" ]] && ok "employee login" || { bad "employee login"; exit 1; }

AAUTH=( -H "Authorization: Bearer $AT" -H "Content-Type: application/json" )
EAUTH=( -H "Authorization: Bearer $ET" -H "Content-Type: application/json" )

PUB=$(curl -sS --max-time 90 -X POST "$API/creation/publish" "${AAUTH[@]}" -d '{
  "name": "Smoke Personal Draft",
  "industry_key": "office",
  "capability_keys": ["inventory_count"],
  "modules": [{"key": "inventory_count", "label": "库存盘点", "kind": "module"}],
  "deliver": "web",
  "source": "prompt",
  "assemble_full_scenes": false
}')
APP=$(echo "$PUB" | python3 -c "import sys,json; print((json.load(sys.stdin).get('app') or {}).get('id',''))" 2>/dev/null || echo "")
[[ -n "$APP" ]] && ok "publish app=$APP" || { bad "publish"; exit 1; }

# 员工拉正式 schema
EMP_FORMAL=$(curl -sS --max-time 20 "$API/runtime/$APP/schema?view=formal" "${EAUTH[@]}")
FTITLE=$(echo "$EMP_FORMAL" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('page_schema') or {}).get('title',''))" 2>/dev/null || echo "")
FVIEW=$(echo "$EMP_FORMAL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('schema_view',''))" 2>/dev/null || echo "")
[[ "$FVIEW" == "formal" ]] && ok "employee formal view=$FVIEW" || bad "employee formal view=$FVIEW"

# 员工保存草稿（改 title）
PS=$(echo "$EMP_FORMAL" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('page_schema') or {}, ensure_ascii=False))")
DRAFT_BODY=$(python3 - <<PY
import json
ps = json.loads('''$PS''')
ps['title'] = '员工个人草稿标题-SMOKE'
menu = ps.get('menu') if isinstance(ps.get('menu'), list) else []
# 确保 capability_keys 含 inventory
caps = list(ps.get('capability_keys') or ['inventory_count'])
if 'inventory_count' not in caps:
  caps.append('inventory_count')
ps['capability_keys'] = caps
print(json.dumps({"page_schema": ps, "summary": "personal draft smoke"}, ensure_ascii=False))
PY
)
DRAFT=$(curl -sS --max-time 30 -X POST "$API/runtime/$APP/schema/changes" "${EAUTH[@]}" -d "$DRAFT_BODY")
CID=$(echo "$DRAFT" | python3 -c "import sys,json; print((json.load(sys.stdin).get('change') or {}).get('id',''))" 2>/dev/null || echo "")
[[ -n "$CID" ]] && ok "employee draft saved id=$CID" || { bad "draft save"; echo "$DRAFT" | head -c 400; exit 1; }

# 员工带 token 读 schema → personal_draft
EMP_PERS=$(curl -sS --max-time 20 "$API/runtime/$APP/schema" "${EAUTH[@]}")
PVIEW=$(echo "$EMP_PERS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('schema_view',''))" 2>/dev/null || echo "")
PTITLE=$(echo "$EMP_PERS" | python3 -c "import sys,json; print((json.load(sys.stdin).get('page_schema') or {}).get('title',''))" 2>/dev/null || echo "")
[[ "$PVIEW" == "personal_draft" ]] && ok "author schema_view=personal_draft" || bad "author view=$PVIEW"
[[ "$PTITLE" == *"个人草稿"* ]] && ok "author sees draft title" || bad "author title=$PTITLE"

# 管理员 / 匿名应仍见正式
ADM=$(curl -sS --max-time 20 "$API/runtime/$APP/schema" "${AAUTH[@]}")
AVIEW=$(echo "$ADM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('schema_view',''))" 2>/dev/null || echo "")
ATITLE=$(echo "$ADM" | python3 -c "import sys,json; print((json.load(sys.stdin).get('page_schema') or {}).get('title',''))" 2>/dev/null || echo "")
[[ "$AVIEW" == "formal" ]] && ok "admin sees formal (no own draft)" || bad "admin view=$AVIEW"
[[ "$ATITLE" != *"个人草稿"* ]] && ok "admin title is formal" || bad "admin wrongly sees draft title=$ATITLE"

ANON=$(curl -sS --max-time 20 "$API/runtime/$APP/schema")
ANON_VIEW=$(echo "$ANON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('schema_view','formal'))" 2>/dev/null || echo "")
[[ "$ANON_VIEW" == "formal" ]] && ok "anonymous formal" || bad "anon view=$ANON_VIEW"

# manifest 对作者也应按草稿
MAN=$(curl -sS --max-time 20 "$API/runtime/$APP/manifest" "${EAUTH[@]}")
MVIEW=$(echo "$MAN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('schema_view',''))" 2>/dev/null || echo "")
[[ "$MVIEW" == "personal_draft" ]] && ok "author manifest schema_view=personal_draft" || bad "manifest view=$MVIEW"

echo "=========================================="
echo " RESULT · pass=$PASS fail=$FAIL"
echo "=========================================="
[[ "$FAIL" -eq 0 ]]
