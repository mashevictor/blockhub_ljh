#!/usr/bin/env bash
# CapShip 场景装配 + Runtime PATCH 冒烟（不依赖 Playwright）
set -euo pipefail
API="${API_BASE:-http://127.0.0.1:8001/api/v1}"

echo "== industry mfg assembly =="
curl -sf "$API/creation/industry/mfg/assembly" | python -c '
import json,sys
d=json.load(sys.stdin)
a=d["assembly"]
assert a["scene_count"]==12, a["scene_count"]
assert len(a["menu_plan"])==12
print("ok:", a["pack_name"], a["scene_count"], "scenes", len(a["capability_keys"]), "keys")
'

echo "== login =="
TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@trackchat.local","password":"admin123"}' \
  | python -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')

echo "== publish mfg full =="
APP=$(curl -sf -X POST "$API/creation/publish" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke-Mfg","industry_key":"mfg","scenario_names":[],"capability_keys":[],"source":"industry","deliver":"web","assemble_full_scenes":true,"web_template_id":"tabs_portal"}')
APP_ID=$(echo "$APP" | python -c 'import json,sys; print(json.load(sys.stdin)["app"]["id"])')
echo "app=$APP_ID"

echo "== schema menu count =="
curl -sf "$API/runtime/$APP_ID/schema" | python -c '
import json,sys
m=json.load(sys.stdin)["page_schema"]["menu"]
assert len(m)>=10, len(m)
print("menu=", len(m))
'

echo "== patch modules =="
curl -sf -X PATCH "$API/runtime/$APP_ID/modules" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"capability_keys":["chat_qa","device_repair","quality_inspect"],"rebuild_schema":true}' \
  | python -c 'import json,sys; d=json.load(sys.stdin); assert d["success"]; print("keys", d["capability_keys"])'

echo "CapShip smoke OK"
