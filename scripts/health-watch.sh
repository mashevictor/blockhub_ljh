#!/usr/bin/env bash
# 健康检查监控（cron / 告警脚本）
#
# 用法:
#   bash scripts/health-watch.sh
#   bash scripts/health-watch.sh http://101.32.209.251
#   bash scripts/health-watch.sh http://101.32.209.251 --strict
#
# cron 示例（每 5 分钟）:
#   */5 * * * * cd /root/blockhub && bash scripts/health-watch.sh http://127.0.0.1 >> /var/log/blockhub-health.log 2>&1
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
STRICT="${2:-}"
API="$BASE/api/v1"
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local code
  code=$(curl -sf -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo "000")
  if [ "$code" = "200" ] || [ "$code" = "307" ]; then
    echo "  ✓ $name ($code)"
  else
    echo "  ✗ $name ($code) $url"
    FAIL=$((FAIL + 1))
  fi
}

echo "=========================================="
echo " BlockHub Health Watch · $BASE"
echo " $(date '+%Y-%m-%d %H:%M %Z' 2>/dev/null || date)"
echo "=========================================="

check "API health" "$API/health"
check "Catalog summary" "$API/catalog/summary"
check "Plaza feed" "$API/creation/plaza/feed"

if [ "$STRICT" = "--strict" ]; then
  check "Home SPA" "$BASE/"
  check "Runtime shell" "$BASE/r/demo"
fi

echo "=========================================="
if [ "$FAIL" -eq 0 ]; then
  echo " OK: all checks passed"
else
  echo " ALERT: $FAIL check(s) failed"
fi
echo "=========================================="
exit "$FAIL"
