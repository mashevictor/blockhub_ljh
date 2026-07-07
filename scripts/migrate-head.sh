#!/usr/bin/env bash
# 快速将数据库升到最新 migration（无 drift 检测）
# 用法: bash scripts/migrate-head.sh
# 推荐生产用: bash scripts/server-db.sh（含 repair + 校验）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

docker compose up -d postgres redis 2>/dev/null || true

bash "$ROOT/scripts/repair-db.sh"

cd "$ROOT/backend"
source .venv/bin/activate

echo "==> alembic upgrade head"
alembic upgrade head
alembic current

python3 <<'PY'
from sqlalchemy import inspect, text
from app.db.session import engine
insp = inspect(engine)
def col(t, c):
    return insp.has_table(t) and c in {x["name"] for x in insp.get_columns(t)}
print("apps.icon_url:", col("apps", "icon_url"))
print("apps.plaza_visibility:", col("apps", "plaza_visibility"))
print("knowledge_bases:", insp.has_table("knowledge_bases"))
print("kb_document_chunks:", insp.has_table("kb_document_chunks"))
with engine.connect() as conn:
    ext = conn.execute(text("SELECT 1 FROM pg_extension WHERE extname='vector'")).fetchone()
    print("pgvector:", bool(ext))
PY

sudo systemctl restart blockhub-api
echo "Done. API restarted."
echo "Verify: bash scripts/smoke-db.sh"
