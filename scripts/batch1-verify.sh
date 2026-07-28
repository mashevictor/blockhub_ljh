#!/usr/bin/env bash
# 批次 1 · P1 生产正式化验收（脚本就绪项）
#
# 用法:
#   bash blockhub.sh batch1 http://124.222.177.43
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://124.222.177.43}"
API="$BASE/api/v1"
FAIL=0
WARN=0

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

warn_step() {
  local name="$1"
  shift
  echo ""
  echo ">>> [$name]"
  if "$@"; then
    echo ">>> ✓ $name"
  else
    echo ">>> · WARN $name (运维待办)"
    WARN=$((WARN + 1))
  fi
}

{
  echo "=============================================="
  echo " BlockHub Batch 1 · P1 Production Readiness"
  echo " Base: $BASE"
  echo " $(date '+%Y-%m-%d %H:%M %Z' 2>/dev/null || date)"
  echo "=============================================="

  step "health-watch" bash "$ROOT/scripts/health-watch.sh" "$BASE" --strict

  warn_step "secrets-check (生产需 0 fail)" \
    bash "$ROOT/scripts/rotate-secrets-check.sh" "$ROOT/backend/.env" 2>/dev/null || true

  step "pg-backup dry-run" env DRY_RUN=1 bash "$ROOT/scripts/pg-backup.sh"

  if [ -f "$ROOT/scripts/nginx-ssl-example.conf" ]; then
    echo ""
    echo ">>> [HTTPS 模板]"
    echo ">>> · 参考 scripts/nginx-ssl-example.conf + certbot（需域名）"
  fi

  echo ""
  echo ">>> [cron 建议]"
  bash "$ROOT/scripts/setup-p1-cron.sh" "$BASE"

  echo ""
  echo "=============================================="
  if [ "$FAIL" -eq 0 ]; then
    echo " ✅ Batch 1 scripts: OK ($WARN warn — 生产机跑 INSTALL=1 setup-p1-cron + pg-backup-drill)"
  else
    echo " ⚠ Batch 1: $FAIL fail, $WARN warn"
  fi
  echo "=============================================="
} 2>&1 | tee "${BATCH1_LOG:-/tmp/batch1-$(date +%Y%m%d-%H%M%S).log}"

exit "$FAIL"
