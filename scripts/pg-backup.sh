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

if [ -f "$ROOT/backend/.env" ]; then
  # shellcheck disable=SC1091
  set -a; source "$ROOT/backend/.env"; set +a
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
