#!/usr/bin/env bash
# P1-3 · 备份 + 恢复演练（不碰生产库业务数据）
#
# 用法（生产机）:
#   bash scripts/pg-backup-drill.sh
#   KEEP_DRILL_DB=1 bash scripts/pg-backup-drill.sh   # 保留演练库便于人工抽查
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups/postgres}"
REPORT="${REPORT:-$ROOT/backups/postgres/DRILL-$(date +%Y%m%d_%H%M%S).txt}"

mkdir -p "$BACKUP_DIR"

{
  echo "BlockHub PG backup drill"
  echo "time: $(date -Iseconds 2>/dev/null || date)"
  echo "host: $(hostname 2>/dev/null || echo unknown)"
  echo ""

  echo "--- 1) backup ---"
  bash "$ROOT/scripts/pg-backup.sh"
  LATEST=$(ls -1t "$BACKUP_DIR"/trackchat_*.sql.gz 2>/dev/null | head -1)
  if [ -z "$LATEST" ]; then
    echo "ERROR: no backup artifact"
    exit 1
  fi
  echo "artifact: $LATEST ($(wc -c < "$LATEST" | tr -d ' ') bytes)"
  echo ""

  echo "--- 2) restore into drill DB ---"
  DRILL=1 KEEP_DRILL_DB="${KEEP_DRILL_DB:-0}" bash "$ROOT/scripts/pg-restore.sh" "$LATEST"
  echo ""

  echo "--- 3) result ---"
  echo "OK: backup + restore drill passed"
  echo "report: $REPORT"
} | tee "$REPORT"

echo ""
echo "✓ 演练记录已写入 $REPORT"
