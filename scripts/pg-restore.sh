#!/usr/bin/env bash
# PostgreSQL 从 pg-backup 产物恢复
#
# 用法:
#   # 恢复到临时库做演练（推荐）
#   DRILL=1 bash scripts/pg-restore.sh backups/postgres/trackchat_YYYYMMDD_HHMMSS.sql.gz
#
#   # 覆盖生产库（危险，需显式确认）
#   CONFIRM=YES bash scripts/pg-restore.sh backups/postgres/trackchat_YYYYMMDD_HHMMSS.sql.gz
#
# 环境变量:
#   DATABASE_URL / backend/.env  — 解析连接信息（与 pg-backup 相同）
#   TARGET_DB                    — 覆盖目标库名（默认：DRILL=1 → ${PGDATABASE}_restore_drill）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="${1:-}"

if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "用法: [DRILL=1|CONFIRM=YES] bash scripts/pg-restore.sh <trackchat_*.sql.gz>"
  exit 1
fi

if [ -f "$ROOT/backend/.env" ]; then
  DATABASE_URL="$(ENV_FILE="$ROOT/backend/.env" python3 <<'PY'
import os
from pathlib import Path

p = Path(os.environ["ENV_FILE"])
for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    if line.startswith("DATABASE_URL="):
        val = line.split("=", 1)[1].strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
            val = val[1:-1]
        print(val)
        break
PY
)"
fi

DATABASE_URL="${DATABASE_URL:-postgresql+psycopg2://trackchat:trackchat@127.0.0.1:5432/trackchat}"

eval "$(DATABASE_URL="$DATABASE_URL" python3 <<'PY'
import os, re
url = os.environ.get("DATABASE_URL", "")
m = re.match(r"postgresql\+\w+://([^:]+):([^@]+)@([^:/]+):?(\d*)/(\w+)", url)
if not m:
    raise SystemExit("ERROR: 无法解析 DATABASE_URL")
user, pwd, host, port, db = m.groups()
port = port or "5432"
print(f"export PGUSER='{user}'")
print(f"export PGPASSWORD='{pwd}'")
print(f"export PGHOST='{host}'")
print(f"export PGPORT='{port}'")
print(f"export PGDATABASE='{db}'")
PY
)"

SRC_DB="$PGDATABASE"
if [ "${DRILL:-0}" = "1" ]; then
  TARGET_DB="${TARGET_DB:-${SRC_DB}_restore_drill}"
elif [ "${CONFIRM:-}" = "YES" ]; then
  TARGET_DB="${TARGET_DB:-$SRC_DB}"
else
  echo "ERROR: 覆盖恢复需 CONFIRM=YES；演练请用 DRILL=1"
  exit 1
fi

echo "==> Restore $DUMP → $TARGET_DB @ $PGHOST:$PGPORT (source ref: $SRC_DB)"

if [ "$TARGET_DB" = "$SRC_DB" ] && [ "${CONFIRM:-}" != "YES" ]; then
  echo "ERROR: 拒绝无确认覆盖生产库"
  exit 1
fi

# 目标库重建后灌入 dump（演练 / 显式 CONFIRM 覆盖均如此）
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TARGET_DB' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $TARGET_DB;
CREATE DATABASE $TARGET_DB OWNER $PGUSER;
SQL

gunzip -c "$DUMP" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$TARGET_DB" -v ON_ERROR_STOP=1 >/tmp/blockhub-pg-restore.out

TABLES=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$TARGET_DB" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
echo "==> Done. public tables=$TABLES"
echo "==> Log: /tmp/blockhub-pg-restore.out"

if [ "${DRILL:-0}" = "1" ] && [ "${KEEP_DRILL_DB:-0}" != "1" ]; then
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $TARGET_DB;"
  echo "==> Drill DB dropped (KEEP_DRILL_DB=1 to retain)"
fi
