#!/usr/bin/env bash
# 批次 2 · 发布 → APK 构建 → download 200
#
# 用法:
#   bash /root/blockhub/blockhub.sh batch2 http://124.222.177.43
#   E2E_APK_POLL_MS=600000 bash scripts/batch2-verify.sh http://124.222.177.43
#
# 注意: 默认不跑 smoke-apk WITH_BUILD，避免与 E2E 后台构建抢 Gradle（小内存机）
#   WITH_BUILD=1 bash scripts/batch2-verify.sh ...  # 额外跑一遍手动构建冒烟
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://124.222.177.43}"
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

  echo ""
  echo ">>> [preflight] APK build environment"
  if [ -x /bin/bash ]; then
    echo "  ✓ /bin/bash exists"
  else
    echo "  ✗ /bin/bash missing"
    FAIL=$((FAIL + 1))
  fi
  if [ -f /etc/systemd/system/blockhub-api.service ]; then
    if grep -qE '/usr/bin:/bin|/bin:/usr/bin' /etc/systemd/system/blockhub-api.service 2>/dev/null; then
      echo "  ✓ systemd PATH includes system bins"
    else
      echo "  · WARN systemd PATH 过窄 — 运行: bash scripts/sync-systemd-api.sh"
    fi
  fi

  if ! curl -sf --max-time 10 "$API/health" >/dev/null 2>&1; then
    echo "WARN: API health failed at $API/health — check systemctl restart blockhub-api"
  fi

  if ! command -v flutter >/dev/null 2>&1; then
    echo "WARN: flutter not in PATH — background APK build may fail"
  fi

  (cd "$ROOT/e2e" && npm install --silent 2>/dev/null || true)
  bash "$ROOT/scripts/e2e-prep-browsers.sh" >/dev/null 2>&1 || true

  # 先跑 E2E（单次后台构建），避免与 smoke-apk WITH_BUILD 并发
  step "E2E publish-apk-status" \
    env E2E_API_URL="$API" E2E_BASE_URL="$BASE" \
      bash -c "cd '$ROOT/e2e' && npx playwright test tests/publish-apk-status.spec.ts --reporter=line"

  step "E2E publish-apk-download (poll ${POLL_MS}ms)" \
    env E2E_API_URL="$API" E2E_BASE_URL="$BASE" E2E_APK_POLL_MS="$POLL_MS" \
      bash -c "cd '$ROOT/e2e' && npx playwright test tests/publish-apk-download.spec.ts --reporter=line"

  step "smoke-apk (503 semantic)" bash "$ROOT/scripts/smoke-apk.sh" "$BASE"

  if [ "${WITH_BUILD:-0}" = "1" ]; then
    step "smoke-apk WITH_BUILD (optional)" env WITH_BUILD=1 bash "$ROOT/scripts/smoke-apk.sh" "$BASE"
  else
    echo ""
    echo ">>> · WITH_BUILD=0，跳过第二次 Gradle 构建（E2E 已覆盖全链路）"
  fi

  echo ""
  echo "=============================================="
  if [ "$FAIL" -eq 0 ]; then
    echo " ✅ Batch 2: ALL PASSED"
  else
    echo " ⚠ Batch 2: $FAIL step(s) failed"
    echo " 排障: docs/APK-BUILD-TROUBLESHOOTING.md"
    echo " 查看: cat backend/uploads/apks/.build-status/<APP_ID>.log"
  fi
  echo " 日志: $LOG"
  echo "=============================================="
} 2>&1 | tee "$LOG"

exit "$FAIL"
