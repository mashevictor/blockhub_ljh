#!/usr/bin/env bash
# P1 生产正式化 · 安装 pg-backup + health-watch cron
#
# 用法:
#   bash scripts/setup-p1-cron.sh                         # 仅预览
#   bash scripts/setup-p1-cron.sh https://www.blockhub.club
#   INSTALL=1 bash scripts/setup-p1-cron.sh https://www.blockhub.club
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-https://www.blockhub.club}"
# health-watch 对公网可走 https；本机 API 也可用 http://127.0.0.1:8001
MARKER_BEGIN="# BEGIN blockhub-p1-cron"
MARKER_END="# END blockhub-p1-cron"

PG_LINE="0 3 * * * cd $ROOT && RETENTION_DAYS=14 bash scripts/pg-backup.sh >> /var/log/blockhub-pg-backup.log 2>&1"
HEALTH_LINE="*/5 * * * * cd $ROOT && bash scripts/health-watch.sh $BASE >> /var/log/blockhub-health.log 2>&1"

echo "=============================================="
echo " BlockHub P1 Cron Setup"
echo " Root: $ROOT"
echo " Health BASE: $BASE"
echo "=============================================="
echo ""
echo "将写入 crontab 的块:"
echo "$MARKER_BEGIN"
echo "$PG_LINE"
echo "$HEALTH_LINE"
echo "$MARKER_END"
echo ""

touch /var/log/blockhub-pg-backup.log /var/log/blockhub-health.log 2>/dev/null || true
mkdir -p "$ROOT/backups/postgres"

if [ "${INSTALL:-0}" = "1" ]; then
  TMP=$(mktemp)
  # 去掉旧块与历史单行
  crontab -l 2>/dev/null | awk -v b="$MARKER_BEGIN" -v e="$MARKER_END" '
    $0==b {skip=1; next}
    $0==e {skip=0; next}
    skip {next}
    /blockhub-pg-backup\.log/ {next}
    /blockhub-health\.log/ {next}
    {print}
  ' > "$TMP" || true
  {
    cat "$TMP"
    echo "$MARKER_BEGIN"
    echo "$PG_LINE"
    echo "$HEALTH_LINE"
    echo "$MARKER_END"
  } | crontab -
  rm -f "$TMP"
  echo "✓ crontab 已更新"
  crontab -l | sed -n "/$MARKER_BEGIN/,/$MARKER_END/p" || crontab -l | grep -E 'pg-backup|health-watch' || true
else
  echo "仅预览。写入 crontab:"
  echo "  INSTALL=1 bash scripts/setup-p1-cron.sh $BASE"
fi
