#!/usr/bin/env bash
# 重置演示账号密码（admin/employee）
# 用法: bash scripts/repair-auth.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
# shellcheck disable=SC1091
source .venv/bin/activate

python3 <<'PY'
from app.db.session import SessionLocal
from app.services.db_seed import ensure_seed_data

db = SessionLocal()
try:
    ensure_seed_data(db)
    print("demo users reset OK:")
    print("  admin@trackchat.local / admin123")
    print("  employee@trackchat.local / emp123")
finally:
    db.close()
PY

sudo systemctl restart blockhub-api 2>/dev/null || systemctl restart blockhub-api 2>/dev/null || true

API_ROOT="${API_BASE:-http://127.0.0.1:8001}"
API_ROOT="${API_ROOT%/}"
API="$API_ROOT/api/v1"

# restart 后立刻 curl 常空响应 → JSONDecodeError；轮询等待就绪
echo "waiting for API at $API ..."
ok=0
code="000"
for i in $(seq 1 30); do
  code=$(curl -sS --max-time 3 -o /tmp/repair-auth-login.json -w "%{http_code}" \
    -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@trackchat.local","password":"admin123"}' 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]] && python3 -c "import json; d=json.load(open('/tmp/repair-auth-login.json')); assert d.get('access_token')" 2>/dev/null; then
    echo "login test: OK (attempt $i)"
    ok=1
    break
  fi
  sleep 1
done
if [[ "$ok" -ne 1 ]]; then
  echo "login test: FAIL (API not ready or password mismatch)"
  echo "  last HTTP=$code body=$(head -c 200 /tmp/repair-auth-login.json 2>/dev/null || true)"
  exit 1
fi
