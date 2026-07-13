#!/usr/bin/env bash
# 生产密钥安全检查（GA 后上线前跑一遍）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/backend/.env}"
WARN=0
FAIL=0

warn() { echo "  · WARN: $1"; WARN=$((WARN + 1)); }
bad()  { echo "  ✗ FAIL: $1"; FAIL=$((FAIL + 1)); }
ok()   { echo "  ✓ $1"; }

echo "=========================================="
echo " Secrets / Production Readiness Check"
echo " Env: $ENV_FILE"
echo "=========================================="

if [ ! -f "$ENV_FILE" ]; then
  bad "missing $ENV_FILE"
  exit 1
fi

JWT=$(grep -E '^JWT_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' || echo "")
if [ -z "$JWT" ]; then
  bad "JWT_SECRET empty"
elif [ "$JWT" = "change-me-in-production-trackchat-d1" ] || [ "${#JWT}" -lt 32 ]; then
  bad "JWT_SECRET still default or too short (<32 chars)"
else
  ok "JWT_SECRET length ${#JWT}"
fi

if grep -qE '^OTP_DEBUG_EXPOSE=true' "$ENV_FILE" 2>/dev/null; then
  warn "OTP_DEBUG_EXPOSE=true (disable in production)"
fi

if grep -qE 'admin123|emp123|trackchat:trackchat@' "$ENV_FILE" 2>/dev/null; then
  warn "env contains demo credentials pattern — rotate DB/user passwords"
fi

if grep -qE '^DATABASE_URL=.*sslmode=require' "$ENV_FILE" 2>/dev/null; then
  ok "DATABASE_URL uses sslmode=require"
else
  warn "DATABASE_URL without sslmode=require (cloud PG should enable SSL)"
fi

echo ""
echo " Result: $FAIL fail, $WARN warn"
[ "$FAIL" -eq 0 ]
