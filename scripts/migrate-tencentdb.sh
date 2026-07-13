#!/usr/bin/env bash
# 腾讯云 PostgreSQL 迁移（Alembic head + 冒烟）
# 用法:
#   export DATABASE_URL='postgresql+psycopg2://user:pass@xxx.tencentcdb.com:5432/trackchat'
#   bash scripts/migrate-tencentdb.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    # shellcheck disable=SC1091
    set -a
    source .env
    set +a
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: 请设置 DATABASE_URL（腾讯云 PostgreSQL 连接串）"
  echo "  示例: postgresql+psycopg2://user:pass@xxx.tencentcdb.com:5432/trackchat?sslmode=require"
  exit 1
fi

echo "==> Target DB: ${DATABASE_URL%%@*}@***"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

echo "==> Alembic upgrade head"
alembic upgrade head
alembic current

echo "==> Verify tables"
python3 <<'PY'
from sqlalchemy import inspect
from app.db.session import engine

required = [
    "users", "custom_capabilities", "catalog_scenarios",
    "notifications", "demo_bookings", "plaza_feed_likes",
]
insp = inspect(engine)
missing = [t for t in required if not insp.has_table(t)]
if missing:
    raise SystemExit(f"ERROR: missing tables: {missing}")
print("    all required tables present")
PY

echo "==> Seed (optional, idempotent)"
cd "$ROOT"
if [ -f scripts/smoke-test.sh ]; then
  bash scripts/smoke-test.sh "${SMOKE_BASE:-http://127.0.0.1:8001}" --seed-only || true
fi

echo "==> Done. Update backend/.env DATABASE_URL and restart API."
