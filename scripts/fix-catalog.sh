#!/usr/bin/env bash
# 修复 Catalog：补全缺失 catalog 表/列 + 强制 seed
# 适用：alembic 已是 head(如 033)，但 catalog_hero_presets / chip_templates 仍不存在
#      （历史 stamp 跳过 003/004，017/033 DDL 不会再跑）
# 用法: bash scripts/fix-catalog.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

# Ubuntu 通常无 `python` 命令；优先 venv，再回落 python3
if [ -x "$ROOT/backend/.venv/bin/python" ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
  PY="$ROOT/backend/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PY="$(command -v python3)"
else
  echo "ERROR: 需要 backend/.venv 或系统 python3"
  exit 1
fi
echo "==> using PY=$PY"

echo "==> [1/6] 检查 catalog 表与 enrichment 列"
NEED_REPAIR=0
"$PY" <<'PY' || NEED_REPAIR=1
from sqlalchemy import inspect
from app.db.session import engine
from app.core.config import settings

# 打印实际连接目标，便于对照 systemd EnvironmentFile
url = (settings.database_url or "").split("@")[-1] if getattr(settings, "database_url", None) else "?"
print(f"  DATABASE host/db: {url}")

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

# NEED_REPAIR 仅作日志；补表步骤始终执行（幂等）
if [ "$NEED_REPAIR" -eq 1 ]; then
  echo "  (首次检查有缺失，将强制 017/033 补表)"
else
  echo "  (首次检查通过，仍强制跑一遍幂等 017/033)"
fi

echo "==> [2/6] alembic upgrade head"
alembic upgrade head || true
alembic current

# 不依赖 stamp：每次幂等跑 017 / 033（create_table_if_missing），避免「inspect 偶发 OK / API 仍缺表」
echo "==> [3/6] 幂等补表/补列（017 + 033，不改 alembic_version）"
"$PY" <<'PY'
from pathlib import Path
import importlib.util
import sys

from alembic.operations import Operations
from alembic.runtime.migration import MigrationContext
from sqlalchemy import inspect, text

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

insp = inspect(engine)
for t in ("catalog_hero_presets", "catalog_chip_templates"):
    ok = insp.has_table(t)
    print(f"  after repair {t}: {'OK' if ok else 'MISSING'}")
    if not ok:
        raise SystemExit(f"repair failed: {t} still missing")
with engine.connect() as conn:
    n = conn.execute(text("SELECT count(*) FROM catalog_hero_presets")).scalar()
    print(f"  catalog_hero_presets rows: {n}")
print("  repair DDL applied")
PY

echo "==> [4/6] 复查 catalog 表"
"$PY" <<'PY'
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
"$PY" <<'PY'
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
sleep 5

HEALTH=$(curl -sf --max-time 10 http://127.0.0.1:8001/api/v1/health || echo "")
if echo "$HEALTH" | grep -q '"status"'; then
  echo " API OK: $HEALTH"
else
  echo "ERROR: API health 失败（进程可能未起来）"
  echo "---- journalctl -u blockhub-api -n 50 ----"
  journalctl -u blockhub-api -n 50 --no-pager || true
  echo "---- systemctl status ----"
  systemctl status blockhub-api --no-pager -l | head -n 40 || true
  exit 1
fi

SUMMARY=$(curl -sf --max-time 15 http://127.0.0.1:8001/api/v1/catalog/summary || echo "")
if echo "$SUMMARY" | grep -q '"source":"database"'; then
  echo " catalog/summary OK (database)"
  echo "$SUMMARY" | "$PY" -c "import sys,json; d=json.load(sys.stdin); print(f\"  source={d.get('source')} hero={d.get('hero_preset_count')} chips={d.get('chip_template_count')} total={d.get('total')}\")" 2>/dev/null || true
elif echo "$SUMMARY" | grep -q '"source"'; then
  echo "ERROR: catalog still not database: $SUMMARY"
  exit 1
else
  echo "ERROR: catalog/summary still failing: $SUMMARY"
  echo "  请查看: journalctl -u blockhub-api -n 40 --no-pager"
  echo "---- journalctl -u blockhub-api -n 40 ----"
  journalctl -u blockhub-api -n 40 --no-pager || true
  exit 1
fi

echo "Done. Run: bash scripts/smoke-db.sh http://127.0.0.1:8001"
