#!/usr/bin/env bash
# 批次 0–5 联跑验收（Post-GA 收口）
#
# 用法:
#   bash blockhub.sh batch-all http://101.32.209.251
#   SKIP_APK=1 bash blockhub.sh batch-all http://101.32.209.251   # batch0 跳过 APK
#   SKIP_BATCH2=1 bash blockhub.sh batch-all ...                  # 跳过耗时的 APK E2E
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://101.32.209.251}"
FAIL=0
LOG="${BATCH_ALL_LOG:-/tmp/batch-all-$(date +%Y%m%d-%H%M%S).log}"

run_batch() {
  local name="$1"
  shift
  echo ""
  echo "##############################################"
  echo " $name"
  echo "##############################################"
  if "$@"; then
    echo ">>> ✓ $name"
  else
    echo ">>> ✗ $name"
    FAIL=$((FAIL + 1))
  fi
}

{
  echo "=============================================="
  echo " BlockHub Batch ALL · Post-GA Verify"
  echo " Base: $BASE"
  echo " $(date '+%Y-%m-%d %H:%M %Z' 2>/dev/null || date)"
  echo "=============================================="
  git -C "$ROOT" log -1 --oneline

  if [ "${SKIP_SYSTEMD_SYNC:-0}" != "1" ] && command -v systemctl >/dev/null 2>&1; then
    run_batch "sync-systemd-api" bash "$ROOT/scripts/sync-systemd-api.sh"
  fi

  if [ "${SKIP_BATCH0:-0}" != "1" ]; then
    run_batch "batch0" env SKIP_APK="${SKIP_APK:-1}" bash "$ROOT/scripts/batch0-verify.sh" "$BASE"
  fi

  run_batch "batch1" bash "$ROOT/scripts/batch1-verify.sh" "$BASE"
  run_batch "batch3" bash "$ROOT/scripts/batch3-verify.sh"

  if [ "${SKIP_BATCH2:-0}" != "1" ]; then
    run_batch "batch2" bash "$ROOT/scripts/batch2-verify.sh" "$BASE"
  else
    echo ""
    echo ">>> · SKIP_BATCH2=1，跳过 APK 全链路"
  fi

  run_batch "batch4" bash "$ROOT/scripts/batch4-verify.sh" "$BASE"
  run_batch "batch5" bash "$ROOT/scripts/batch5-verify.sh"

  echo ""
  echo "=============================================="
  if [ "$FAIL" -eq 0 ]; then
    echo " ✅ Batch ALL: $FAIL failures"
    echo " 运维待办: HTTPS · GitHub E2E_STAGING_BASE · JWT 轮换 · cron"
  else
    echo " ⚠ Batch ALL: $FAIL batch(es) failed"
  fi
  echo " 日志: $LOG"
  echo "=============================================="
} 2>&1 | tee "$LOG"

exit "$FAIL"
