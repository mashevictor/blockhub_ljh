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
    if has_table("kb_document_chunks"):
        return "009"
    if has_column("apps", "plaza_visibility"):
        return "008"
    if has_column("apps", "icon_url"):
        return "007"
    if has_column("tenants", "config_json"):
        return "006"
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
    ("tenants.config_json", has_column("tenants", "config_json")),
    ("apps.icon_url", has_column("apps", "icon_url")),
    ("apps.primary_color", has_column("apps", "primary_color")),
    ("apps.plaza_visibility", has_column("apps", "plaza_visibility")),
    ("knowledge_bases", has_table("knowledge_bases")),
    ("kb_document_chunks", has_table("kb_document_chunks")),
]
for label, ok in checks:
    print(f"  {label}: {'OK' if ok else 'MISSING'}")
PY

schema_level() {
  python3 -c "
from sqlalchemy import inspect
from app.db.session import engine
insp = inspect(engine)
def col(t,c):
    return insp.has_table(t) and c in {x['name'] for x in insp.get_columns(t)}
if not insp.has_table('users'): print(''); raise SystemExit
if insp.has_table('kb_document_chunks'): print('009')
elif col('apps','plaza_visibility'): print('008')
elif col('apps','icon_url'): print('007')
elif col('tenants','config_json'): print('006')
elif insp.has_table('contracts'): print('005')
elif col('users','phone') and insp.has_table('catalog_office_scenarios') and insp.has_table('catalog_hero_presets'): print('004')
elif col('users','phone') and insp.has_table('catalog_office_scenarios'): print('003')
elif col('users','phone'): print('002')
else: print('001')
"
}

has_icon_url() {
  python3 -c "
from sqlalchemy import inspect
from app.db.session import engine
insp = inspect(engine)
ok = insp.has_table('apps') and 'icon_url' in {c['name'] for c in insp.get_columns('apps')}
raise SystemExit(0 if ok else 1)
" 2>/dev/null
}

SCHEMA_REV="$(schema_level)"
ALEMBIC_REV="$(alembic current 2>/dev/null | grep -oE '00[1-9]' | tail -1 || true)"
HEAD_REV="$(alembic heads 2>/dev/null | grep -oE '00[1-9]' | tail -1 || echo '009')"

echo "==> head=$HEAD_REV alembic=${ALEMBIC_REV:-none} schema≈${SCHEMA_REV:-none}"

if [ -z "$SCHEMA_REV" ]; then
  echo "==> fresh DB → alembic upgrade head"
  alembic upgrade head
elif [ -n "$ALEMBIC_REV" ] && [ "$ALEMBIC_REV" != "$SCHEMA_REV" ]; then
  echo "==> DRIFT: alembic=$ALEMBIC_REV but schema≈$SCHEMA_REV — stamp then upgrade"
  alembic stamp "$SCHEMA_REV"
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
fi

# 常见坑：alembic 与 schema 同是 005，但 head 已是 007 → 必须 upgrade
if [ "${ALEMBIC_REV:-}" != "$HEAD_REV" ] || ! has_icon_url; then
  echo "==> alembic upgrade head (need newer migrations)"
  alembic upgrade head
fi

alembic current

python3 <<'PY'
from sqlalchemy import inspect
from app.db.session import engine
insp = inspect(engine)
def col(t, c):
    return insp.has_table(t) and c in {x["name"] for x in insp.get_columns(t)}
for t in ["users", "catalog_office_scenarios", "catalog_hero_presets", "contracts"]:
    ok = insp.has_table(t)
    print(f"verify {t}: {'OK' if ok else 'MISSING'}")
print(f"verify users.phone: {'OK' if col('users', 'phone') else 'MISSING'}")
print(f"verify tenants.config_json: {'OK' if col('tenants', 'config_json') else 'MISSING'}")
print(f"verify apps.icon_url: {'OK' if col('apps', 'icon_url') else 'MISSING'}")
print(f"verify apps.plaza_visibility: {'OK' if col('apps', 'plaza_visibility') else 'MISSING'}")
print(f"verify knowledge_bases: {'OK' if insp.has_table('knowledge_bases') else 'MISSING'}")
print(f"verify kb_document_chunks: {'OK' if insp.has_table('kb_document_chunks') else 'MISSING'}")
if not col("apps", "icon_url"):
    raise SystemExit("FAIL: apps.icon_url still missing after upgrade")
if not insp.has_table("kb_document_chunks"):
    raise SystemExit("FAIL: kb_document_chunks missing — need migration 009 + pgvector")
PY

echo "==> restart API"
sudo systemctl restart blockhub-api
sleep 2
curl -sf --max-time 5 http://127.0.0.1:8001/api/v1/health && echo " API health OK" || {
  echo "WARN: API health failed — journalctl -u blockhub-api -n 30"
  exit 1
}

echo "=========================================="
echo " Repair complete."
echo " Test publish: bash $ROOT/scripts/smoke-db.sh"
echo " Full smoke:   bash $ROOT/scripts/smoke-test.sh http://101.32.209.251"
echo "=========================================="
