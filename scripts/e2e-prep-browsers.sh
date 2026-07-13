#!/usr/bin/env bash
# E2E 依赖：npm ci/install + Playwright Chromium（浏览器测试前调用）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/e2e"

if [ ! -d node_modules ]; then
  if [ -f package-lock.json ]; then
    npm ci --silent
  else
    npm install --silent
  fi
fi

# --with-deps 需 root/apt；失败则回退仅下载 browser binary
if ! npx playwright install chromium --with-deps 2>/dev/null; then
  npx playwright install chromium
fi

echo "==> Playwright chromium ready"
