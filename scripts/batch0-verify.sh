#!/usr/bin/env bash
# 批次 0 · 基线确认（v0.2.0-ga + main 最新）
#
# 用法（服务器，仓库根目录）:
#   bash /root/blockhub/blockhub.sh batch0
#   bash /root/blockhub/blockhub.sh batch0 http://101.32.209.251
#   SKIP_APK=1 bash scripts/batch0-verify.sh http://101.32.209.251 2>&1 | tee /tmp/batch0-$(date +%Y%m%d-%H%M).log
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://101.32.209.251}"
API="$BASE/api/v1"
LOG="${BATCH0_LOG:-/tmp/batch0-$(date +%Y%m%d-%H%M%S).log}"
FAIL=0

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
  echo " BlockHub Batch 0 Verify"
  echo " Base: $BASE"
  echo " Root: $ROOT"
  echo " $(date '+%Y-%m-%d %H:%M %Z' 2>/dev/null || date)"
  echo "=============================================="

  echo ""
  echo "--- Git ---"
  git -C "$ROOT" log -1 --oneline
  git -C "$ROOT" describe --tags --always 2>/dev/null || true

  echo ""
  echo "--- API restart (optional) ---"
  if command -v systemctl >/dev/null 2>&1 && systemctl is-active blockhub-api >/dev/null 2>&1; then
    sudo systemctl restart blockhub-api
    sleep 3
    curl -sf "$API/health" | head -c 200 || echo "WARN: health not ready yet"
  else
    echo "· skip systemctl (not found or service inactive)"
    curl -sf "$API/health" | head -c 200 || echo "WARN: API health check failed"
  fi

  step "smoke-build-manifest" bash "$ROOT/scripts/smoke-build-manifest.sh"
  step "health-watch" bash "$ROOT/scripts/health-watch.sh" "$BASE"
  step "ga-checklist (8+1, SKIP_APK=1)" env SKIP_APK=1 bash "$ROOT/scripts/ga-checklist.sh" "$BASE"

  echo ""
  echo "--- Playwright API E2E ---"
  (cd "$ROOT/e2e" && npm install --silent 2>/dev/null || npm ci --silent 2>/dev/null || true)
  bash "$ROOT/scripts/e2e-prep-browsers.sh" >/dev/null 2>&1 || true

  step "E2E ga9-manifest-crop" \
    env E2E_API_URL="$API" E2E_BASE_URL="$BASE" \
      bash -c "cd '$ROOT/e2e' && npx playwright test tests/ga9-manifest-crop.spec.ts --reporter=line"

  step "E2E publish-apk-status" \
    env E2E_API_URL="$API" E2E_BASE_URL="$BASE" \
      bash -c "cd '$ROOT/e2e' && npx playwright test tests/publish-apk-status.spec.ts --reporter=line"

  step "E2E publish-runtime-plaza" \
    env E2E_API_URL="$API" E2E_BASE_URL="$BASE" \
      bash -c "cd '$ROOT/e2e' && npx playwright test tests/publish-runtime-plaza.spec.ts --reporter=line"

  if [ "${SKIP_BROWSER_E2E:-0}" != "1" ]; then
    step "E2E home-publish (browser)" \
      env E2E_HOME_URL="$BASE" E2E_BASE_URL="$BASE" E2E_API_URL="$API" \
        bash -c "cd '$ROOT/e2e' && npx playwright test tests/home-publish.spec.ts --project=chromium --reporter=line"
  else
    echo ""
    echo ">>> · SKIP_BROWSER_E2E=1，跳过 home-publish 浏览器测试"
  fi

  echo ""
  echo "=============================================="
  if [ "$FAIL" -eq 0 ]; then
    echo " ✅ Batch 0: ALL PASSED"
    echo " 日志: $LOG"
    echo " 可归档本输出作为 GA 签字附件"
  else
    echo " ⚠ Batch 0: $FAIL step(s) failed — 见上方 ✗"
    echo " 日志: $LOG"
  fi
  echo "=============================================="
} 2>&1 | tee "$LOG"

exit "$FAIL"
