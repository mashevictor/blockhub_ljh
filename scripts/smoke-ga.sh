#!/usr/bin/env bash
# GA 收口冒烟：串联 regression + custom capability + load
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://127.0.0.1:8001}"

echo "=========================================="
echo " GA Smoke Suite · $BASE"
echo "=========================================="

bash "$ROOT/scripts/smoke-test.sh" "$BASE"
bash "$ROOT/scripts/regression-114.sh" "$BASE"
bash "$ROOT/scripts/smoke-custom-capability.sh" "$BASE"
bash "$ROOT/scripts/smoke-capability-contract.sh" "$BASE"
bash "$ROOT/scripts/load-10vu.sh" "$BASE" 10

if [ "${SKIP_APK:-0}" != "1" ]; then
  echo ""
  echo "=== APK Smoke ==="
  bash "$ROOT/scripts/smoke-apk.sh" "$BASE" || true
fi

if [ -d "$ROOT/e2e" ]; then
  echo ""
  echo "=== Playwright E2E ==="
  bash "$ROOT/scripts/e2e-prep-browsers.sh"
  E2E_API_URL="$BASE/api/v1" E2E_BASE_URL="$BASE" \
    (cd "$ROOT/e2e" && npx playwright test --reporter=list) \
    && echo "  ✓ playwright e2e" || { echo "  ✗ playwright e2e"; exit 1; }
fi

echo ""
echo " GA smoke suite passed"
echo " Sign-off: bash scripts/ga-checklist.sh $BASE"
