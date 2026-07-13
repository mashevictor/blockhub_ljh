#!/usr/bin/env bash
# 批次 2 · 发布 → APK 构建 → download 200
#
# 用法:
#   bash /root/blockhub/blockhub.sh batch2 http://101.32.209.251
#   E2E_APK_POLL_MS=600000 bash scripts/batch2-verify.sh http://101.32.209.251  # 10 分钟超时
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://101.32.209.251}"
API="$BASE/api/v1"
LOG="${BATCH2_LOG:-/tmp/batch2-$(date +%Y%m%d-%H%M%S).log}"
FAIL=0
POLL_MS="${E2E_APK_POLL_MS:-1800000}"

step() {
  local name="$1"
  shift
  echo ""
  echo ">>> [$name]"
  if "$@"; then
    echo ">>> ✓ $name"
  else
    echo ">>> ✗ $name"
    FAIL=$((FAIL + 1))
  fi
}

{
  echo "=============================================="
  echo " BlockHub Batch 2 Verify · APK download chain"
  echo " Base: $BASE"
  echo " Poll timeout: ${POLL_MS}ms"
  echo " $(date '+%Y-%m-%d %H:%M %Z' 2>/dev/null || date)"
  echo "=============================================="

  git -C "$ROOT" log -1 --oneline

  if ! curl -sf --max-time 10 "$API/health" >/dev/null 2>&1; then
    echo "WARN: API health failed at $API/health — check systemctl restart blockhub-api"
  fi

  if ! command -v flutter >/dev/null 2>&1; then
    echo "WARN: flutter not in PATH — background APK build may fail"
  fi

  step "smoke-apk (503 semantic)" bash "$ROOT/scripts/smoke-apk.sh" "$BASE"

  if [ "${WITH_BUILD:-1}" = "1" ]; then
    step "smoke-apk WITH_BUILD" env WITH_BUILD=1 bash "$ROOT/scripts/smoke-apk.sh" "$BASE"
  fi

  (cd "$ROOT/e2e" && npm install --silent 2>/dev/null || true)
  bash "$ROOT/scripts/e2e-prep-browsers.sh" >/dev/null 2>&1 || true

  step "E2E publish-apk-status" \
    env E2E_API_URL="$API" E2E_BASE_URL="$BASE" \
      bash -c "cd '$ROOT/e2e' && npx playwright test tests/publish-apk-status.spec.ts --reporter=line"

  step "E2E publish-apk-download (poll ${POLL_MS}ms)" \
    env E2E_API_URL="$API" E2E_BASE_URL="$BASE" E2E_APK_POLL_MS="$POLL_MS" \
      bash -c "cd '$ROOT/e2e' && npx playwright test tests/publish-apk-download.spec.ts --reporter=line"

  echo ""
  echo "=============================================="
  if [ "$FAIL" -eq 0 ]; then
    echo " ✅ Batch 2: ALL PASSED"
  else
    echo " ⚠ Batch 2: $FAIL step(s) failed"
    echo " 排障: docs/APK-BUILD-TROUBLESHOOTING.md"
  fi
  echo " 日志: $LOG"
  echo "=============================================="
} 2>&1 | tee "$LOG"

exit "$FAIL"
