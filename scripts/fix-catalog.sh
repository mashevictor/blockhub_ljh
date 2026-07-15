#!/usr/bin/env bash
# 修复 Catalog：补全缺失 catalog 表/列 + 强制 seed
# 适用：alembic 已是 head(如 033)，但 catalog_hero_presets / chip_templates 仍不存在
#      （历史 stamp 跳过 003/004，017/033 DDL 不会再跑）
# 用法: bash scripts/fix-catalog.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
source .venv/bin/activate

echo "==> [1/6] 检查 catalog 表与 enrichment 列"
NEED_REPAIR=0
python3 <<'PY' || NEED_REPAIR=1
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
cols_needed = ("enrichment_json", "enriched_at", "enrichment_source")
if insp.has_table("catalog_industry_packs"):
    have = {c["name"] for c in insp.get_columns("catalog_industry_packs")}
    miss_cols = [c for c in cols_needed if c not in have]
    print(f"  enrichment cols: {'OK' if not miss_cols else 'MISSING ' + ','.join(miss_cols)}")
    if miss_cols:
        missing.append("catalog_industry_packs.enrichment_*")
else:
    print("  enrichment cols: SKIP (no packs table)")
if missing:
    print(f"  missing: {', '.join(missing)}")
    raise SystemExit(1)
print("  all catalog tables + enrichment OK")
PY

echo "==> [2/6] alembic upgrade head"
alembic upgrade head || true
alembic current

# 不依赖 stamp：用 Alembic Operations 上下文直接跑 017 / 033 的幂等 DDL
if [ "$NEED_REPAIR" -eq 1 ]; then
  echo "==> [3/6] 幂等补表/补列（017 + 033，不改 alembic_version）"
  python3 <<'PY'
from pathlib import Path
import importlib.util
import sys

import sqlalchemy as sa
from alembic.operations import Operations
from alembic.runtime.migration import MigrationContext

from app.db.session import engine

BACKEND_ALEMBIC = Path.cwd() / "alembic"
sys.path.insert(0, str(BACKEND_ALEMBIC))

def load_rev(name: str):
    path = BACKEND_ALEMBIC / "versions" / name
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod

rev017 = load_rev("017_repair_catalog_tables.py")
rev033 = load_rev("033_industry_pack_enrichment.py")

with engine.begin() as conn:
    ctx = MigrationContext.configure(conn)
    with Operations.context(ctx):
        rev017.upgrade()
        rev033.upgrade()
print("  repair DDL applied")
PY
else
  echo "==> [3/6] 无需补表，跳过"
fi

echo "==> [4/6] 复查 catalog 表"
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
    raise SystemExit(f"still missing tables: {missing}")
have = {c["name"] for c in insp.get_columns("catalog_industry_packs")}
for c in ("enrichment_json", "enriched_at", "enrichment_source"):
    if c not in have:
        raise SystemExit(f"still missing column: {c}")
print("  all catalog tables + enrichment OK")
PY

echo "==> [5/6] 强制 seed catalog"
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

echo "==> [6/6] 重启 API"
sudo systemctl restart blockhub-api
sleep 3
curl -sf --max-time 10 http://127.0.0.1:8001/api/v1/health && echo " API OK"

SUMMARY=$(curl -sf --max-time 10 http://127.0.0.1:8001/api/v1/catalog/summary || echo "")
if echo "$SUMMARY" | grep -q '"source":"database"'; then
  echo " catalog/summary OK (database)"
  echo "$SUMMARY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"  source={d.get('source')} hero={d.get('hero_preset_count')} chips={d.get('chip_template_count')}\")" 2>/dev/null || true
elif echo "$SUMMARY" | grep -q '"source"'; then
  echo "ERROR: catalog still not database: $SUMMARY"
  exit 1
else
  echo "ERROR: catalog/summary still failing: $SUMMARY"
  exit 1
fi

echo "Done. Run: bash scripts/smoke-db.sh http://127.0.0.1:8001"
