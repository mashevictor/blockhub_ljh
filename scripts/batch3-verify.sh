#!/usr/bin/env bash
# 批次 3 · CI / staging E2E 门禁检查
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

check() {
  if [ -f "$ROOT/$1" ]; then
    echo "  ✓ $1"
  else
    echo "  ✗ missing $1"
    FAIL=$((FAIL + 1))
  fi
}

echo "=============================================="
echo " BlockHub Batch 3 · CI / Staging E2E"
echo "=============================================="

check ".github/workflows/e2e-staging-pr.yml"
check ".github/workflows/ci-smoke.yml"
check "docs/GITHUB-E2E-SETUP.md"

echo ""
echo "GitHub Secret 待配置:"
echo "  E2E_STAGING_BASE = http://124.222.177.43  (或你的 staging 域名)"
echo ""
echo "配置后 PR 将自动跑 home-publish + ga9"
echo "手动触发: gh workflow run e2e-staging-pr.yml"

[ "$FAIL" -eq 0 ]
