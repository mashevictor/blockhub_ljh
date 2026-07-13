#!/usr/bin/env bash
# P1 生产正式化 · 安装 pg-backup + health-watch cron（打印 crontab 行，不强制写入）
#
# 用法:
#   bash scripts/setup-p1-cron.sh
#   INSTALL=1 bash scripts/setup-p1-cron.sh   # 追加到 root crontab
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://127.0.0.1:8001}"

PG_LINE="0 3 * * * cd $ROOT && bash scripts/pg-backup.sh >> /var/log/blockhub-pg-backup.log 2>&1"
HEALTH_LINE="*/5 * * * * cd $ROOT && bash scripts/health-watch.sh $BASE >> /var/log/blockhub-health.log 2>&1"

echo "=============================================="
echo " BlockHub P1 Cron Setup"
echo " Root: $ROOT"
echo "=============================================="
echo ""
echo "建议追加到 crontab -e :"
echo ""
echo "$PG_LINE"
echo "$HEALTH_LINE"
echo ""

if [ "${INSTALL:-0}" = "1" ]; then
  (crontab -l 2>/dev/null | grep -v blockhub-pg-backup | grep -v blockhub-health || true
   echo "$PG_LINE"
   echo "$HEALTH_LINE") | crontab -
  echo "✓ crontab 已更新"
  crontab -l | grep blockhub || true
else
  echo "仅预览。写入 crontab: INSTALL=1 bash scripts/setup-p1-cron.sh"
fi
