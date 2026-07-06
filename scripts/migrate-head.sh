#!/usr/bin/env bash
# 快速将数据库升到最新 migration（无 drift 检测）
# 用法: bash scripts/migrate-head.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
source .venv/bin/activate

echo "==> alembic upgrade head"
alembic upgrade head
alembic current

python3 -c "
from sqlalchemy import inspect
from app.db.session import engine
insp = inspect(engine)
cols = {c['name'] for c in insp.get_columns('apps')} if insp.has_table('apps') else set()
print('apps.icon_url:', 'icon_url' in cols)
print('apps.primary_color:', 'primary_color' in cols)
"

sudo systemctl restart blockhub-api
echo "Done. API restarted."
