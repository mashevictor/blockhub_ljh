#!/usr/bin/env bash
# 通用办公 · 交互冒烟（页面可达 + Runtime schema 交互契约 + 关键场景端到端）
#
# 用法（部署后）:
#   bash scripts/smoke-office66-ui.sh https://blockhub.club
#   bash scripts/smoke-office66-ui.sh https://blockhub.club <app_id>
#   # 无 app_id 时会先 publish 一个 Office66 应用再测
#
# 说明:
# - 不依赖 Playwright；用 HTTP 验证预览页/Runtime 壳可达，并用 API 模拟用户「打开场景→提交→推进」
# - 浏览器手工清单打印在末尾
set -euo pipefail

SITE="${1:-https://blockhub.club}"
SITE="${SITE%/}"
APP_ID="${2:-}"
API="$SITE/api/v1"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

PASS=0
FAIL=0
ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "=========================================="
echo " Office66 UI/Interaction Smoke · $SITE"
echo "=========================================="

http_code() {
  curl -sS -o /dev/null -w "%{http_code}" --max-time 20 "$1" || echo "000"
}

echo ""
echo "=== A) 页面可达 ==="
CODE=$(http_code "$SITE/")
[[ "$CODE" =~ ^2|3 ]] && ok "home $CODE" || bad "home HTTP $CODE"

CODE=$(http_code "$SITE/preview/industry-runtime/office")
# SPA 可能返回 200 HTML
[[ "$CODE" =~ ^2|3 ]] && ok "preview/office $CODE" || bad "preview/office HTTP $CODE"

TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
if [[ -z "$TOKEN" ]]; then
  curl -sf -X POST "$API/auth/demo-bootstrap" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 || true
  TOKEN=$(curl -sf -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
fi
[[ -n "$TOKEN" ]] && ok "login for UI flows" || { bad "login"; echo "fail=$FAIL"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

if [[ -z "$APP_ID" ]]; then
  echo ""
  echo "=== B) 自动发布 Office66 供 Runtime 交互 ==="
  PUB=$(curl -sf -X POST "$API/creation/publish" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d '{
      "name":"Office66-UI-Smoke",
      "industry_key":"office",
      "scenario_names":[],
      "source":"industry",
      "deliver":"web",
      "assemble_full_scenes":true,
      "web_template_id":"sidebar_admin"
    }' || echo "")
  APP_ID=$(echo "$PUB" | python3 -c 'import sys,json;d=json.load(sys.stdin);print((d.get("app") or d).get("id",""))' 2>/dev/null || echo "")
  [[ -n "$APP_ID" ]] && ok "published app=$APP_ID" || bad "publish for UI"
fi

if [[ -n "$APP_ID" ]]; then
  CODE=$(http_code "$SITE/r/$APP_ID")
  [[ "$CODE" =~ ^2|3 ]] && ok "runtime /r/$APP_ID $CODE" || bad "runtime HTTP $CODE"

  echo ""
  echo "=== C) Runtime schema 交互契约（菜单=场景入口）==="
  SCH=$(curl -sf "$API/runtime/$APP_ID/schema" -H "$AUTH" || echo "")
  echo "$SCH" | python3 -c '
import json,sys
d=json.load(sys.stdin)
ps=d.get("page_schema") or {}
menu=ps.get("menu") or []
children=(ps.get("root") or {}).get("children") or []
print(f"menu={len(menu)} children={len(children)}")
assert len(menu)>=60, len(menu)
# 每场景应有 route + capability_key + 可打开的 child
by_route={}
for c in children:
  r=(c.get("props") or {}).get("route") or ""
  if r: by_route[r]=c
miss=0
for m in menu[:20]:
  route=m.get("route") or ""
  if route and route not in by_route:
    miss+=1
assert miss==0, f"menu/child route mismatch miss={miss}"
# 必测场景标签存在
labels={m.get("label") for m in menu}
for name in ("请假申请","报销审批","会议室预约","IT报障","通用审批","制度政策问答"):
  assert name in labels, name
print("scene_labels_ok")
' && ok "schema menu/children/labels" || bad "schema interaction contract"

  echo ""
  echo "=== D) 模拟用户交互：8 组各 1 条 ==="
  # 人事：请假
  LR=$(curl -sf -X POST "$API/leave-request/records" -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"category\":\"annual\",\"start_at\":\"2026-07-22\",\"end_at\":\"2026-07-23\",\"note\":\"ui-smoke\",\"app_public_id\":\"$APP_ID\"}" || echo "")
  LR_ID=$(echo "$LR" | python3 -c 'import sys,json;print((json.load(sys.stdin).get("record") or {}).get("id",""))' 2>/dev/null || echo "")
  [[ -n "$LR_ID" ]] && ok "UI流·请假提交" || bad "UI流·请假提交"
  if [[ -n "$LR_ID" ]]; then
    curl -sf -X POST "$API/leave-request/records/$LR_ID/approved" -H "$AUTH" -H "Content-Type: application/json" -d '{}' >/dev/null \
      && ok "UI流·请假通过" || bad "UI流·请假通过"
  fi

  # 财务：报销
  EC=$(curl -sf -X POST "$API/expense-claim/records" -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"category\":\"travel\",\"title\":\"UI报销\",\"amount\":\"88\",\"app_public_id\":\"$APP_ID\"}" || echo "")
  EC_ID=$(echo "$EC" | python3 -c 'import sys,json;print((json.load(sys.stdin).get("record") or {}).get("id",""))' 2>/dev/null || echo "")
  [[ -n "$EC_ID" ]] && ok "UI流·报销提交" || bad "UI流·报销提交"

  # 流程：通用审批
  AP=$(curl -sf -X POST "$API/approvals" -H "$AUTH" -H "Content-Type: application/json" \
    -d '{"title":"UI通用审批","type":"general","department":"行政","summary":"ui-smoke"}' || echo "")
  AP_ID=$(echo "$AP" | python3 -c 'import sys,json;print((json.load(sys.stdin).get("approval") or {}).get("id",""))' 2>/dev/null || echo "")
  [[ -n "$AP_ID" ]] && ok "UI流·审批提交" || bad "UI流·审批提交"
  if [[ -n "$AP_ID" ]]; then
    curl -sf -X POST "$API/approvals/$AP_ID/action" -H "$AUTH" -H "Content-Type: application/json" \
      -d '{"action":"approve","comment":"ui"}' >/dev/null && ok "UI流·审批通过" || bad "UI流·审批通过"
  fi

  # IT
  IT=$(curl -sf -X POST "$API/it-ticket/tickets" -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"title\":\"UI报障\",\"detail\":\"x\",\"urgency\":\"low\",\"app_public_id\":\"$APP_ID\"}" || echo "")
  IT_ID=$(echo "$IT" | python3 -c 'import sys,json;d=json.load(sys.stdin);print((d.get("ticket") or d.get("record") or {}).get("id",""))' 2>/dev/null || echo "")
  [[ -n "$IT_ID" ]] && ok "UI流·IT提交" || bad "UI流·IT提交"

  # 会议室
  MT=$(curl -sf -X POST "$API/meeting-booking/records" -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"room_name\":\"B201\",\"title\":\"UI会\",\"start_at\":\"2026-07-22 10:00\",\"end_at\":\"2026-07-22 11:00\",\"app_public_id\":\"$APP_ID\"}" || echo "")
  MT_ID=$(echo "$MT" | python3 -c 'import sys,json;print((json.load(sys.stdin).get("record") or {}).get("id",""))' 2>/dev/null || echo "")
  [[ -n "$MT_ID" ]] && ok "UI流·会议室提交" || bad "UI流·会议室提交"

  # 资产
  AS=$(curl -sf -X POST "$API/asset-manage/records" -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"asset_name\":\"显示器\",\"quantity\":\"1\",\"app_public_id\":\"$APP_ID\"}" || echo "")
  AS_ID=$(echo "$AS" | python3 -c 'import sys,json;print((json.load(sys.stdin).get("record") or {}).get("id",""))' 2>/dev/null || echo "")
  [[ -n "$AS_ID" ]] && ok "UI流·资产提交" || bad "UI流·资产提交"

  # 刷新列表：用户应在 Runtime 对应菜单看到记录
  LT=$(curl -sf "$API/leave-request/records?app_id=$APP_ID" -H "$AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("total",0))' 2>/dev/null || echo 0)
  [[ "${LT:-0}" -ge 1 ]] && ok "UI流·请假列表可见($LT)" || bad "UI流·请假列表空"
fi

echo ""
echo "=== E) 浏览器手工清单（建议 5 分钟）==="
cat <<EOF
  1. 打开 $SITE/preview/industry-runtime/office
     - 侧栏约 66 项；点「请假申请」填表提交，右侧出现记录，点「通过」
  2. 打开 $SITE/r/${APP_ID:-<app_id>}
     - 登录 admin；点「加班申请 / 报销审批 / 会议室预约 / IT报障 / 通用审批」
     - 各提交 1 条，列表刷新；审批类点通过/驳回
  3. 右下角编排助手：「加一个团建经费审批」→ 菜单新增并可打开
EOF

echo ""
echo "=========================================="
echo " pass=$PASS fail=$FAIL"
[[ -n "$APP_ID" ]] && echo " Runtime: $SITE/r/$APP_ID"
echo " Preview: $SITE/preview/industry-runtime/office"
echo "=========================================="
[[ "$FAIL" -eq 0 ]]
