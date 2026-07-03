#!/usr/bin/env bash
# 修复 alembic 版本与真实 schema 不一致（常见于历史 stamp head）
# 用法: bash scripts/repair-db.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
source .venv/bin/activate

echo "=========================================="
echo " BlockHub DB Repair"
echo " Repo: $ROOT"
echo "=========================================="

python3 <<'PY'
from sqlalchemy import inspect, text

from app.db.session import engine

insp = inspect(engine)

def has_table(name: str) -> bool:
    return insp.has_table(name)

def has_column(table: str, col: str) -> bool:
    if not has_table(table):
        return False
    return col in {c["name"] for c in insp.get_columns(table)}

def schema_revision() -> str | None:
    if not has_table("users"):
        return None
    if has_table("contracts"):
        return "005"
    has_phone = has_column("users", "phone")
    has_catalog = has_table("catalog_office_scenarios")
    has_hero = has_table("catalog_hero_presets")
    if has_phone and has_catalog and has_hero:
        return "004"
    if has_phone and has_catalog:
        return "003"
    if has_phone:
        return "002"
    return "001"

schema_rev = schema_revision()
print(f"schema revision (detected): {schema_rev or 'empty'}")

with engine.connect() as conn:
    if not insp.has_table("alembic_version"):
        print("alembic_version: missing")
        alembic_rev = None
    else:
        row = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
        alembic_rev = row[0] if row else None
        print(f"alembic revision (recorded): {alembic_rev or 'empty'}")

checks = [
    ("users.phone", has_column("users", "phone")),
    ("catalog_office_scenarios", has_table("catalog_office_scenarios")),
    ("catalog_hero_presets", has_table("catalog_hero_presets")),
    ("contracts", has_table("contracts")),
]
for label, ok in checks:
    print(f"  {label}: {'OK' if ok else 'MISSING'}")

if schema_rev is None:
    print("No users table — fresh DB, run: alembic upgrade head")
    raise SystemExit(0)

if alembic_rev == schema_rev:
    print("Schema matches alembic — no repair needed.")
    raise SystemExit(0)

print(f"DRIFT: alembic={alembic_rev} but schema≈{schema_rev}")
PY

# Re-detect for shell logic
SCHEMA_REV=$(python3 -c "
from sqlalchemy import inspect
from app.db.session import engine
insp = inspect(engine)
def col(t,c):
    return insp.has_table(t) and c in {x['name'] for x in insp.get_columns(t)}
if not insp.has_table('users'): print(''); raise SystemExit
if insp.has_table('contracts'): print('005')
elif col('users','phone') and insp.has_table('catalog_office_scenarios') and insp.has_table('catalog_hero_presets'): print('004')
elif col('users','phone') and insp.has_table('catalog_office_scenarios'): print('003')
elif col('users','phone'): print('002')
else: print('001')
")

ALEMBIC_REV=$(alembic current 2>/dev/null | grep -oE '00[1-5]' | tail -1 || true)

if [ -z "$SCHEMA_REV" ]; then
  echo "==> fresh DB → alembic upgrade head"
  alembic upgrade head
  exit 0
fi

if [ "$ALEMBIC_REV" = "$SCHEMA_REV" ]; then
  echo "==> schema OK at $SCHEMA_REV"
  exit 0
fi

echo "==> stamping alembic to schema level $SCHEMA_REV (was ${ALEMBIC_REV:-unknown})"
alembic stamp "$SCHEMA_REV"

# 004 表可能先于 003 被创建；回退后需删掉以便 upgrade 004 重跑
if [ "$SCHEMA_REV" != "004" ]; then
  python3 <<'PY'
from sqlalchemy import text
from app.db.session import engine
with engine.begin() as conn:
    conn.execute(text("DROP TABLE IF EXISTS catalog_chip_templates CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS catalog_hero_presets CASCADE"))
print("dropped orphan 004 tables (if any)")
PY
fi

echo "==> alembic upgrade head"
alembic upgrade head
alembic current

python3 <<'PY'
from sqlalchemy import inspect
from app.db.session import engine
insp = inspect(engine)
for t in ["users", "catalog_office_scenarios", "catalog_hero_presets", "contracts"]:
    ok = insp.has_table(t)
    print(f"verify {t}: {'OK' if ok else 'MISSING'}")
phone = "phone" in {c["name"] for c in insp.get_columns("users")} if insp.has_table("users") else False
print(f"verify users.phone: {'OK' if phone else 'MISSING'}")
PY

echo "==> restart API"
sudo systemctl restart blockhub-api
sleep 2
curl -sf --max-time 5 http://127.0.0.1:8001/api/v1/health && echo " API health OK" || {
  echo "WARN: API health failed — journalctl -u blockhub-api -n 30"
  exit 1
}

echo "=========================================="
echo " Repair complete. Run: bash scripts/smoke-test.sh http://101.32.209.251"
echo "=========================================="
