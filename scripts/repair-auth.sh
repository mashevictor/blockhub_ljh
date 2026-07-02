#!/usr/bin/env bash
# 重置演示账号密码（admin/employee）
# 用法: bash scripts/repair-auth.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
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
sleep 2
curl -sf -X POST http://127.0.0.1:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trackchat.local","password":"admin123"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('login test:', 'OK' if d.get('access_token') else 'FAIL')"
