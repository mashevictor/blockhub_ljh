#!/usr/bin/env bash
# 快速检查 PostgreSQL + 009 知识库表（经 API + 直连校验）
# 用法:
#   bash scripts/smoke-db.sh                          # 本机 Nginx
#   bash scripts/smoke-db.sh http://101.32.209.251    # 外网
#   bash scripts/smoke-db.sh http://127.0.0.1:8001    # 直连 API
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://127.0.0.1}"
API="$BASE/api/v1"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

pass=0
fail=0
ok() { echo "  ✓ $1"; pass=$((pass + 1)); }
bad() { echo "  ✗ $1"; fail=$((fail + 1)); }

echo "=========================================="
echo " BlockHub DB Smoke"
echo " Target: $API"
echo "=========================================="

echo ""
echo "=== Schema (009) ==="
if [ -f "$ROOT/backend/.venv/bin/activate" ]; then
  cd "$ROOT/backend"
  # shellcheck disable=SC1091
  source .venv/bin/activate
  ALEMBIC_REV=$(alembic current 2>/dev/null | grep -oE '00[0-9]+' | tail -1 || echo "")
  if [ "$ALEMBIC_REV" = "009" ]; then ok "alembic current=009"; else bad "alembic current=$ALEMBIC_REV (expected 009)"; fi
  if python3 <<'PY'
from sqlalchemy import inspect, text
from app.db.session import engine
insp = inspect(engine)
for t in ("knowledge_bases", "kb_documents", "kb_document_chunks"):
    if not insp.has_table(t):
        raise SystemExit(1)
with engine.connect() as conn:
    if not conn.execute(text("SELECT 1 FROM pg_extension WHERE extname='vector'")).fetchone():
        raise SystemExit(2)
PY
  then
    ok "tables: knowledge_bases, kb_documents, kb_document_chunks + pgvector"
  else
    bad "kb tables/pgvector missing — run: bash scripts/server-db.sh"
  fi
  cd "$ROOT"
else
  bad "backend/.venv not found — run deploy first"
fi

echo ""
echo "=== API + PG ==="
HEALTH=$(curl -sf "$API/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"status"'; then ok "API /health"; else bad "API /health (is blockhub-api running?)"; fi

SUMMARY=$(curl -sf "$API/catalog/summary" 2>/dev/null || echo "")
if echo "$SUMMARY" | grep -q '"source":"database"'; then
  ok "Catalog reads PostgreSQL"
  echo "$SUMMARY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"      agents={d.get('agent_count')} office={d.get('office_count')} total={d.get('total')}\")
" 2>/dev/null || true
else
  bad "Catalog not from database ($SUMMARY)"
fi

LOGIN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || echo "")
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
if [ -n "$TOKEN" ]; then ok "users table + login"; else bad "login failed — $LOGIN"; fi

PUBLISH=$(curl -sf -X POST "$API/creation/publish" \
  -H "Content-Type: application/json" \
  -d '{"name":"DB冒烟探测","industry_key":"office","scenario_names":["制度政策问答"],"contact_email":"smoke@test.local"}' 2>/dev/null || echo "")
if echo "$PUBLISH" | grep -q '"success":true'; then ok "apps table write"; else bad "apps write failed — $PUBLISH"; fi

if [ -n "$TOKEN" ]; then
  KB_STATS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/kb/stats" 2>/dev/null || echo "")
  if echo "$KB_STATS" | grep -q '"knowledge_bases"'; then ok "GET /kb/stats (D7 tables wired)"; else bad "GET /kb/stats ($KB_STATS)"; fi
fi

echo ""
echo "=========================================="
echo " Result: $pass passed, $fail failed"
if [ "$fail" -eq 0 ]; then
  echo " PostgreSQL + 009 schema OK"
else
  echo " 修复: bash scripts/server-db.sh"
  echo " 诊断: bash scripts/diagnose-api.sh"
fi
echo "=========================================="
[ "$fail" -eq 0 ] || exit 1
