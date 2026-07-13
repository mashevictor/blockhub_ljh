#!/usr/bin/env bash
# 服务器 GA 一键验收（签字前跑一遍，输出汇总）
#
# 用法:
#   bash /root/blockhub/blockhub.sh signoff
#   bash scripts/server-ga-signoff.sh http://101.32.209.251
#   SKIP_APK=1 bash scripts/server-ga-signoff.sh http://101.32.209.251
#   SKIP_BROWSER_E2E=1 bash scripts/server-ga-signoff.sh http://101.32.209.251
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://101.32.209.251}"
export SKIP_APK="${SKIP_APK:-1}"

echo "=============================================="
echo " BlockHub GA Sign-off Suite"
echo " Base: $BASE"
echo " $(date '+%Y-%m-%d %H:%M %Z' 2>/dev/null || date)"
echo "=============================================="

FAIL=0

run_step() {
  local name="$1"
  shift
  echo ""
  echo ">>> $name"
  if "$@"; then
    echo ">>> ✓ $name"
  else
    echo ">>> ✗ $name"
    FAIL=$((FAIL + 1))
  fi
}

run_step "server-capability-test" \
  bash "$ROOT/scripts/server-capability-test.sh" "$BASE"

run_step "smoke-w5 (契约/审计)" \
  bash "$ROOT/scripts/smoke-w5.sh" "$BASE"

run_step "load-10vu (P95)" \
  bash "$ROOT/scripts/load-10vu.sh" "$BASE" 10

run_step "ga-checklist (8 items)" \
  bash "$ROOT/scripts/ga-checklist.sh" "$BASE"

if [ "${SKIP_BROWSER_E2E:-0}" != "1" ]; then
  run_step "e2e-prep browsers" \
    bash "$ROOT/scripts/e2e-prep-browsers.sh"

  run_step "home-publish E2E" \
    env E2E_HOME_URL="$BASE" E2E_BASE_URL="$BASE" E2E_API_URL="$BASE/api/v1" \
      bash -c "cd '$ROOT/e2e' && npx playwright test tests/home-publish.spec.ts --project=chromium --reporter=line"
else
  echo ""
  echo ">>> · SKIP_BROWSER_E2E=1，跳过浏览器 E2E"
fi

if [ "${WITH_FLUTTER_LIST:-0}" = "1" ]; then
  run_step "flutter-build --list" \
    bash "$ROOT/scripts/flutter-build-custom.sh" --list
fi

echo ""
echo "=============================================="
if [ "$FAIL" -eq 0 ]; then
  echo " ✅ GA Sign-off: ALL PASSED"
  echo " Tag: v0.2.0-ga-rc1"
  echo " 可归档本输出 + ga-checklist 结果作为签字附件"
else
  echo " ⚠ GA Sign-off: $FAIL step(s) failed"
fi
echo "=============================================="
exit "$FAIL"
