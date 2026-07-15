#!/usr/bin/env bash
# 修复 Catalog 500：补全缺失 catalog 表 + 强制 seed
# 适用：alembic 已是 head(如 033)，但 catalog_hero_presets / catalog_chip_templates 仍不存在
#      （历史 stamp 跳过 003/004，017 也不会再跑）
# 用法: bash scripts/fix-catalog.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
source .venv/bin/activate

echo "==> [1/5] 检查 catalog 表"
MISSING=0
python3 <<'PY' || MISSING=1
from sqlalchemy import inspect
from app.db.session import engine

tables = [
    "catalog_agents", "catalog_capabilities", "catalog_office_scenarios",
    "catalog_industry_scenarios", "catalog_hero_presets", "catalog_chip_templates",
    "catalog_office_groups", "catalog_industry_packs",
]
insp = inspect(engine)
missing = [t for t in tables if not insp.has_table(t)]
for t in tables:
    print(f"  {t}: {'OK' if t not in missing else 'MISSING'}")
if missing:
    print(f"  missing: {', '.join(missing)}")
    raise SystemExit(1)
PY

echo "==> [2/5] alembic upgrade head"
alembic upgrade head
alembic current

# head 已超前时，upgrade 不会重跑 017 → 需回放幂等补表迁移
if [ "$MISSING" -eq 1 ]; then
  echo "==> [2b/5] 回放 017 repair（stamp 016 → upgrade 017 → stamp head）"
  HEAD_REV="$(alembic heads 2>/dev/null | awk '{print $1}' | head -1 || echo head)"
  alembic stamp 016
  alembic upgrade 017
  alembic stamp "$HEAD_REV"
  alembic current
fi

if [ "$MISSING" -eq 1 ]; then
  echo "==> [3/5] 复查 catalog 表"
  python3 <<'PY'
from sqlalchemy import inspect
from app.db.session import engine

tables = [
    "catalog_agents", "catalog_capabilities", "catalog_office_scenarios",
    "catalog_industry_scenarios", "catalog_hero_presets", "catalog_chip_templates",
    "catalog_office_groups", "catalog_industry_packs",
]
insp = inspect(engine)
missing = [t for t in tables if not insp.has_table(t)]
if missing:
    raise SystemExit(f"still missing: {missing}")
print("  all catalog tables OK")
PY
else
  echo "==> [3/5] catalog 表已齐全"
fi

echo "==> [4/5] 强制 seed catalog"
python3 <<'PY'
from app.db.session import SessionLocal
from app.services.catalog_seed import seed_catalog
from app.services.db_seed import ensure_seed_data

db = SessionLocal()
try:
    ensure_seed_data(db)
    counts = seed_catalog(db, force=True)
    print("seed OK:", counts)
finally:
    db.close()
PY

echo "==> [5/5] 重启 API"
sudo systemctl restart blockhub-api
sleep 3
curl -sf --max-time 10 http://127.0.0.1:8001/api/v1/health && echo " API OK"

SUMMARY=$(curl -sf --max-time 10 http://127.0.0.1:8001/api/v1/catalog/summary || echo "")
if echo "$SUMMARY" | grep -q '"source"'; then
  echo " catalog/summary OK"
  echo "$SUMMARY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"  source={d.get('source')} hero={d.get('hero_preset_count')} chips={d.get('chip_template_count')}\")" 2>/dev/null || true
else
  echo "ERROR: catalog/summary still failing: $SUMMARY"
  exit 1
fi

echo "Done. Run: bash scripts/smoke-db.sh http://127.0.0.1:8001"
