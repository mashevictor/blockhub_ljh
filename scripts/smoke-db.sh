#!/usr/bin/env bash
# 快速检查 PostgreSQL + 最新 schema（经 API + 直连校验）
# 用法:
#   bash scripts/smoke-db.sh                          # 本机 API :8001
#   bash scripts/smoke-db.sh http://101.32.209.251    # 经 Nginx
#   bash scripts/smoke-db.sh http://127.0.0.1:8001    # 直连 API
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://127.0.0.1:8001}"
# 兼容传入根 URL 或 :8001
if [[ "$BASE" == *":8001"* ]] || [[ "$BASE" == *":8000"* ]]; then
  API="${BASE%/}/api/v1"
else
  API="${BASE%/}/api/v1"
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

pass=0
fail=0
ok() { echo "  ✓ $1"; pass=$((pass + 1)); }
bad() { echo "  ✗ $1"; fail=$((fail + 1)); }

json_field() {
  local json="$1" key="$2"
  echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$key',''))" 2>/dev/null || echo ""
}

echo "=========================================="
echo " BlockHub DB Smoke"
echo " Target: $API"
echo "=========================================="

echo ""
echo "=== Schema (alembic head) ==="
if [ -f "$ROOT/backend/.venv/bin/activate" ]; then
  cd "$ROOT/backend"
  # shellcheck disable=SC1091
  source .venv/bin/activate
  # 版本号已到 03x+，勿再写死 01[0-9]
  HEAD_REV=$(alembic heads 2>/dev/null | grep -oE '[0-9]{3}' | sort -n | tail -1 || true)
  if [ -z "$HEAD_REV" ]; then
    HEAD_REV=$(ls alembic/versions/[0-9][0-9][0-9]_*.py 2>/dev/null | sed 's|.*/||;s|_.*||' | sort -n | tail -1 || echo "033")
  fi
  ALEMBIC_REV=$(alembic current 2>/dev/null | grep -oE '[0-9]{3}' | sort -n | tail -1 || echo "")
  HEAD_NUM=$((10#${HEAD_REV:-0}))
  CUR_NUM=$((10#${ALEMBIC_REV:-0}))
  if [ -n "$ALEMBIC_REV" ] && [ "$CUR_NUM" -ge "$HEAD_NUM" ] && [ "$HEAD_NUM" -gt 0 ]; then
    if [ "$CUR_NUM" -gt "$HEAD_NUM" ]; then
      ok "alembic current=$ALEMBIC_REV (DB 超前于代码 head=$HEAD_REV — 请 git pull)"
    else
      ok "alembic current=$ALEMBIC_REV (head)"
    fi
  elif [ -n "$ALEMBIC_REV" ] && [ "$CUR_NUM" -lt "$HEAD_NUM" ]; then
    bad "alembic current=$ALEMBIC_REV (head=$HEAD_REV) — run: alembic upgrade head"
  elif [ -n "$ALEMBIC_REV" ]; then
    ok "alembic current=$ALEMBIC_REV"
  else
    bad "alembic current unknown — run: bash scripts/server-db.sh"
  fi
  if python3 <<'PY'
from sqlalchemy import inspect, text
from app.db.session import engine
insp = inspect(engine)
def col(t, c):
    return insp.has_table(t) and c in {x["name"] for x in insp.get_columns(t)}
required = [
    "knowledge_bases", "kb_documents", "kb_document_chunks",
    "approvals", "conversations", "chat_messages", "custom_capabilities",
    "plaza_feed_likes", "notifications", "demo_bookings",
    "catalog_agents", "catalog_office_scenarios", "catalog_hero_presets",
    "catalog_chip_templates",
    "sales_lead_records", "deal_evidence_records", "kill_pipeline_records",
]
missing = [t for t in required if not insp.has_table(t)]
if missing:
    print("MISSING_TABLES:", ", ".join(missing), flush=True)
    raise SystemExit(1)
if not col("apps", "page_schema") or not col("apps", "build_manifest"):
    print("MISSING_COLUMNS: apps.page_schema / apps.build_manifest", flush=True)
    raise SystemExit(3)
with engine.connect() as conn:
    if not conn.execute(text("SELECT 1 FROM pg_extension WHERE extname='vector'")).fetchone():
        print("MISSING_EXTENSION: vector", flush=True)
        raise SystemExit(2)
PY
  then
    ok "tables: kb + plaza + demo_bookings + page_schema"
  else
    bad "schema tables missing — run: bash scripts/fix-catalog.sh  (再看上方 MISSING_TABLES)"
  fi
  cd "$ROOT"
else
  bad "backend/.venv not found — run deploy first"
fi

echo ""
echo "=== API + PG ==="
HEALTH=$(curl -sf --max-time 10 "$API/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"status"'; then ok "API /health"; else bad "API /health (is blockhub-api running?)"; fi

LOGIN=$(curl -sf --max-time 10 -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || echo "")
TOKEN=$(json_field "$LOGIN" "access_token")
if [ -n "$TOKEN" ]; then ok "users table + login"; else bad "login failed — ${LOGIN:-empty}"; fi

# Catalog 未 seed 时 summary 可能为空或计数为 0 — 先尝试 seed
if [ -n "$TOKEN" ]; then
  SEED_BODY=$(curl -sf --max-time 30 -X POST "$API/seed" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"force":false}' 2>/dev/null || echo "")
  if echo "$SEED_BODY" | grep -q '"success"'; then
    ok "POST /seed (catalog ready)"
  else
    echo "  · seed skipped or already done"
  fi
fi

SUMMARY=$(curl -sf --max-time 15 "$API/catalog/summary" 2>/dev/null || echo "")
CATALOG_SOURCE=$(json_field "$SUMMARY" "source")
if [ "$CATALOG_SOURCE" = "database" ]; then
  ok "Catalog reads PostgreSQL"
  TOTAL=$(json_field "$SUMMARY" "total")
  HERO=$(json_field "$SUMMARY" "hero_preset_count")
  echo "      total=${TOTAL:-?} hero_presets=${HERO:-?}"
elif [ -n "$SUMMARY" ]; then
  bad "Catalog source!=database ($SUMMARY)"
else
  HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 "$API/catalog/summary" 2>/dev/null || echo "000")
  if [ -n "$TOKEN" ]; then
    echo "  · catalog HTTP $HTTP_CODE — 尝试 force seed..."
    curl -sf --max-time 60 -X POST "$API/seed" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"force":true}' >/dev/null || true
    SUMMARY=$(curl -sf --max-time 15 "$API/catalog/summary" 2>/dev/null || echo "")
    CATALOG_SOURCE=$(json_field "$SUMMARY" "source")
  fi
  if [ "$CATALOG_SOURCE" = "database" ]; then
    ok "Catalog reads PostgreSQL (after seed retry)"
    TOTAL=$(json_field "$SUMMARY" "total")
    HERO=$(json_field "$SUMMARY" "hero_preset_count")
    echo "      total=${TOTAL:-?} hero_presets=${HERO:-?}"
  else
    bad "Catalog /summary failed (HTTP $HTTP_CODE) — run: bash scripts/fix-catalog.sh"
  fi
fi

PUBLISH=$(curl -sf --max-time 15 -X POST "$API/creation/publish" \
  -H "Content-Type: application/json" \
  -d '{"name":"DB冒烟探测","industry_key":"office","scenario_names":["制度政策问答"],"contact_email":"smoke@test.local"}' 2>/dev/null || echo "")
if echo "$PUBLISH" | grep -q '"success":true'; then ok "apps table write"; else bad "apps write failed — ${PUBLISH:-empty}"; fi

if [ -n "$TOKEN" ]; then
  KB_STATS=$(curl -sf --max-time 10 -H "Authorization: Bearer $TOKEN" "$API/kb/stats" 2>/dev/null || echo "")
  if echo "$KB_STATS" | grep -q '"knowledge_bases"'; then ok "GET /kb/stats (D7 tables wired)"; else bad "GET /kb/stats (${KB_STATS:-empty})"; fi

  APPR_SUBMIT=$(curl -sf --max-time 10 -X POST "$API/approvals" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"title":"DB冒烟审批","type":"general","department":"QA","summary":"smoke submit"}' 2>/dev/null || echo "")
  if echo "$APPR_SUBMIT" | grep -q '"success":true'; then ok "POST /approvals submit (010)"; else bad "POST /approvals (${APPR_SUBMIT:-empty})"; fi
fi

echo ""
echo "=========================================="
echo " Result: $pass passed, $fail failed"
if [ "$fail" -eq 0 ]; then
  echo " PostgreSQL + schema OK"
else
  echo " 修复: bash scripts/fix-catalog.sh"
  echo " 或:   bash scripts/server-db.sh"
fi
echo "=========================================="
[ "$fail" -eq 0 ] || exit 1
