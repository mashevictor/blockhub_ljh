#!/usr/bin/env bash
# 改页审批全角色冒烟：员工提交→管理员通过 / 驳回重提 / 直接发布作废 / 个人草稿单侧
#
# 用法:
#   bash scripts/smoke-schema-approval-full.sh
#   bash scripts/smoke-schema-approval-full.sh http://127.0.0.1:8001
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
BASE="${BASE%/}"
[[ "$BASE" == *"/api/v1" ]] && API="$BASE" || API="$BASE/api/v1"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
EMP_EMAIL="${EMP_EMAIL:-employee@trackchat.local}"
EMP_PASSWORD="${EMP_PASSWORD:-emp123}"

PASS=0
FAIL=0
ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

py() { python3 -c "$1"; }

login() {
  curl -sS --max-time 20 -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" \
    | py "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo ""
}

echo "=========================================="
echo " Schema approval full smoke · $API"
echo "=========================================="

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

publish_app() {
  local name="$1"
  curl -sS --max-time 90 -X POST "$API/creation/publish" "${AAUTH[@]}" -d "{
    \"name\": \"$name\",
    \"industry_key\": \"office\",
    \"capability_keys\": [\"inventory_count\", \"approval_inbox\"],
    \"modules\": [
      {\"key\": \"inventory_count\", \"label\": \"库存盘点\", \"kind\": \"module\"},
      {\"key\": \"approval_inbox\", \"label\": \"审批待办\", \"kind\": \"module\"}
    ],
    \"deliver\": \"web\",
    \"source\": \"prompt\",
    \"assemble_full_scenes\": false
  }"
}

fetch_ps() {
  local app="$1" token="$2"
  curl -sS --max-time 20 "$API/runtime/$app/schema" -H "Authorization: Bearer $token" \
    | py "import sys,json; print(json.dumps(json.load(sys.stdin).get('page_schema') or {}, ensure_ascii=False))"
}

fetch_rev() {
  local app="$1" token="$2"
  curl -sS --max-time 20 "$API/runtime/$app/schema" -H "Authorization: Bearer $token" \
    | py "import sys,json; print(json.load(sys.stdin).get('schema_rev',1))"
}

# --- 1) 员工提交 → 管理员审批通过 ---
echo ""
echo "=== 1) employee submit → admin approve ==="
PUB=$(publish_app "Smoke Approve Flow")
APP1=$(echo "$PUB" | py "import sys,json; print((json.load(sys.stdin).get('app') or {}).get('id',''))")
[[ -n "$APP1" ]] && ok "app1=$APP1" || { bad "publish app1"; exit 1; }
PS1=$(fetch_ps "$APP1" "$ET")
REV1=$(fetch_rev "$APP1" "$ET")
DRAFT1=$(curl -sS --max-time 30 -X POST "$API/runtime/$APP1/schema/changes" "${EAUTH[@]}" -d "$(py "
import json
ps=json.loads('''$PS1''')
ps['title']='员工改页-待审批'
print(json.dumps({'page_schema': ps, 'summary': 'approve flow'}, ensure_ascii=False))
")")
CID1=$(echo "$DRAFT1" | py "import sys,json; print((json.load(sys.stdin).get('change') or {}).get('id',''))")
SUB1=$(curl -sS --max-time 30 -X POST "$API/runtime/$APP1/schema/changes/submit" "${EAUTH[@]}" -d "{\"change_id\":\"$CID1\"}")
ST1=$(echo "$SUB1" | py "import sys,json; print((json.load(sys.stdin).get('change') or {}).get('status',''))")
[[ "$ST1" == "pending" ]] && ok "employee submitted pending" || bad "submit1 status=$ST1"
AP1=$(curl -sS --max-time 30 -X POST "$API/runtime/$APP1/schema/changes/$CID1/approve" "${AAUTH[@]}" -d '{"comment":"smoke ok","force":false}')
AST1=$(echo "$AP1" | py "import sys,json; print((json.load(sys.stdin).get('change') or {}).get('status',''))")
[[ "$AST1" == "approved" ]] && ok "admin approved" || bad "approve status=$AST1"
EMP_FORMAL=$(curl -sS --max-time 20 "$API/runtime/$APP1/schema?view=formal" "${EAUTH[@]}")
FT=$(echo "$EMP_FORMAL" | py "import sys,json; print((json.load(sys.stdin).get('page_schema') or {}).get('title',''))")
[[ "$FT" == *"待审批"* ]] && ok "formal schema updated after approve" || bad "formal title=$FT"

# --- 2) 驳回 → 重提 ---
echo ""
echo "=== 2) reject → resubmit ==="
PS2=$(fetch_ps "$APP1" "$ET")
DRAFT2=$(curl -sS --max-time 30 -X POST "$API/runtime/$APP1/schema/changes" "${EAUTH[@]}" -d "$(py "
import json
ps=json.loads('''$PS2''')
ps['title']='员工改页-将被驳回'
print(json.dumps({'page_schema': ps, 'summary': 'reject flow'}, ensure_ascii=False))
")")
CID2=$(echo "$DRAFT2" | py "import sys,json; print((json.load(sys.stdin).get('change') or {}).get('id',''))")
curl -sS --max-time 30 -X POST "$API/runtime/$APP1/schema/changes/submit" "${EAUTH[@]}" -d "{\"change_id\":\"$CID2\"}" >/dev/null
RJ=$(curl -sS --max-time 30 -X POST "$API/runtime/$APP1/schema/changes/$CID2/reject" "${AAUTH[@]}" -d '{"comment":"smoke reject"}')
RST=$(echo "$RJ" | py "import sys,json; print((json.load(sys.stdin).get('change') or {}).get('status',''))")
[[ "$RST" == "rejected" ]] && ok "admin rejected" || bad "reject status=$RST"
RESUB=$(curl -sS --max-time 30 -X POST "$API/runtime/$APP1/schema/changes/submit" "${EAUTH[@]}" -d "{\"change_id\":\"$CID2\"}")
RST2=$(echo "$RESUB" | py "import sys,json; print((json.load(sys.stdin).get('change') or {}).get('status',''))")
[[ "$RST2" == "pending" ]] && ok "employee resubmitted after reject" || bad "resubmit status=$RST2"

# --- 3) 员工 pending + 管理员直接发布 → cancelled + supersede_detail ---
echo ""
echo "=== 3) direct publish supersedes pending ==="
PUB3=$(publish_app "Smoke Direct Publish")
APP3=$(echo "$PUB3" | py "import sys,json; print((json.load(sys.stdin).get('app') or {}).get('id',''))")
PS3=$(fetch_ps "$APP3" "$ET")
REV3=$(fetch_rev "$APP3" "$AT")
DRAFT3=$(curl -sS --max-time 30 -X POST "$API/runtime/$APP3/schema/changes" "${EAUTH[@]}" -d "$(py "
import json
ps=json.loads('''$PS3''')
ps['title']='员工草稿-将被覆盖'
print(json.dumps({'page_schema': ps, 'summary': 'direct publish test'}, ensure_ascii=False))
")")
CID3=$(echo "$DRAFT3" | py "import sys,json; print((json.load(sys.stdin).get('change') or {}).get('id',''))")
curl -sS --max-time 30 -X POST "$API/runtime/$APP3/schema/changes/submit" "${EAUTH[@]}" -d "{\"change_id\":\"$CID3\"}" >/dev/null
PATCH3=$(curl -sS --max-time 30 -X PATCH "$API/runtime/$APP3/schema" "${AAUTH[@]}" -d "$(py "
import json
ps=json.loads('''$PS3''')
ps['title']='管理员直接发布版'
print(json.dumps({'page_schema': ps, 'base_rev': int('$REV3'), 'force': True, 'source': 'admin_direct', 'direct_publish': True}, ensure_ascii=False))
")")
SUP=$(echo "$PATCH3" | py "import sys,json; d=json.load(sys.stdin); print(d.get('superseded_changes', d.get('supersede_detail',{}).get('closed_count',0)))")
[[ "${SUP:-0}" -ge 1 ]] && ok "direct publish superseded=$SUP" || bad "superseded=$SUP"
LIST3=$(curl -sS --max-time 20 "$API/runtime/$APP3/schema/changes" "${AAUTH[@]}")
CST3=$(echo "$LIST3" | py "
import sys,json
items=json.load(sys.stdin).get('items') or []
cid='$CID3'
for c in items:
  if c.get('id')==cid:
    print(c.get('status','')); break
else:
  print('missing')
")
[[ "$CST3" == "cancelled" ]] && ok "pending change cancelled" || bad "change3 status=$CST3"

# --- 4) 个人草稿单侧（作者 vs 他人）---
echo ""
echo "=== 4) personal draft author-only ==="
PUB4=$(publish_app "Smoke Personal Draft")
APP4=$(echo "$PUB4" | py "import sys,json; print((json.load(sys.stdin).get('app') or {}).get('id',''))")
PS4=$(fetch_ps "$APP4" "$ET")
curl -sS --max-time 30 -X POST "$API/runtime/$APP4/schema/changes" "${EAUTH[@]}" -d "$(py "
import json
ps=json.loads('''$PS4''')
ps['title']='个人草稿单侧'
print(json.dumps({'page_schema': ps, 'summary': 'personal draft'}, ensure_ascii=False))
")" >/dev/null
AUTH_VIEW=$(curl -sS --max-time 20 "$API/runtime/$APP4/schema" "${EAUTH[@]}" \
  | py "import sys,json; d=json.load(sys.stdin); print(d.get('schema_view',''), (d.get('page_schema') or {}).get('title',''))")
ADM_VIEW=$(curl -sS --max-time 20 "$API/runtime/$APP4/schema" "${AAUTH[@]}" \
  | py "import sys,json; d=json.load(sys.stdin); print(d.get('schema_view','formal'))")
echo "$AUTH_VIEW" | grep -q "personal_draft" && ok "author personal_draft" || bad "author view=$AUTH_VIEW"
[[ "$ADM_VIEW" == "formal" ]] && ok "admin still formal" || bad "admin view=$ADM_VIEW"

echo "=========================================="
echo " RESULT · pass=$PASS fail=$FAIL"
echo "=========================================="
[[ "$FAIL" -eq 0 ]]
