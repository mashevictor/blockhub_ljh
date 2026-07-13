#!/usr/bin/env bash
# PostgreSQL 逻辑备份（cron 每日执行）
#
# 用法:
#   bash scripts/pg-backup.sh
#   RETENTION_DAYS=7 bash scripts/pg-backup.sh
#
# cron 示例（每天 3:00）:
#   0 3 * * * cd /root/blockhub && bash scripts/pg-backup.sh >> /var/log/blockhub-pg-backup.log 2>&1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
STAMP=$(date +%Y%m%d_%H%M%S)

# 仅解析 DATABASE_URL，避免 source 整份 .env 时未加引号的值（如 App 名称）被 shell 执行
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

# 解析连接串 postgresql+psycopg2://user:pass@host:port/db
eval "$(python3 <<PY
import os, re
url = os.environ.get("DATABASE_URL", "")
m = re.match(r"postgresql\\+\\w+://([^:]+):([^@]+)@([^:/]+):?(\\d*)/(\\w+)", url)
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

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "==> DRY_RUN: parsed $PGDATABASE @ $PGHOST:$PGPORT (skip pg_dump)"
  exit 0
fi

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/trackchat_${STAMP}.sql.gz"

echo "==> Backup $PGDATABASE @ $PGHOST:$PGPORT → $OUT"
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" --no-owner --no-acl | gzip > "$OUT"

SIZE=$(wc -c < "$OUT" | tr -d ' ')
echo "==> Done ($SIZE bytes)"

if [ "$RETENTION_DAYS" -gt 0 ] 2>/dev/null; then
  find "$BACKUP_DIR" -name 'trackchat_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
  echo "==> Retention: ${RETENTION_DAYS} days"
fi

ls -lh "$BACKUP_DIR"/trackchat_*.sql.gz 2>/dev/null | tail -5 || true
