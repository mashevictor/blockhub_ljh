#!/usr/bin/env bash
# 诊断 API 502 / 登录失败
# 用法: bash scripts/diagnose-api.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=========================================="
echo " BlockHub API Diagnostics"
echo " Repo: $ROOT"
echo " Git: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "=========================================="

echo ""
echo "=== 1. systemd blockhub-api ==="
systemctl is-active blockhub-api 2>/dev/null || echo "inactive"
systemctl status blockhub-api --no-pager -l 2>/dev/null | head -20 || true

echo ""
echo "=== 2. Recent API logs ==="
journalctl -u blockhub-api -n 40 --no-pager 2>/dev/null || echo "(no journal)"

echo ""
echo "=== 3. Port 8001 ==="
ss -ltnp 2>/dev/null | grep 8001 || netstat -ltnp 2>/dev/null | grep 8001 || echo "8001 not listening"

echo ""
echo "=== 4. Direct API health ==="
curl -sv --max-time 5 http://127.0.0.1:8001/api/v1/health 2>&1 | tail -5 || echo "direct health FAILED"

echo ""
echo "=== 5. Nginx proxy health ==="
curl -sv --max-time 5 http://127.0.0.1/api/v1/health 2>&1 | tail -5 || echo "nginx health FAILED"

echo ""
echo "=== 6. PostgreSQL ==="
if [ -f "$ROOT/backend/.env" ]; then
  grep -E '^DATABASE_URL=' "$ROOT/backend/.env" | sed 's/:[^:@]*@/:***@/'
  cd "$ROOT/backend" && source .venv/bin/activate 2>/dev/null || true
  python3 -c "
from app.db.session import engine
from sqlalchemy import inspect, text
with engine.connect() as c:
    c.execute(text('SELECT 1'))
    print('DB connect: OK')
    insp = inspect(engine)
    for t in ['users','catalog_office_scenarios','catalog_hero_presets']:
        print(f'  table {t}:', 'yes' if insp.has_table(t) else 'NO')
" 2>&1 || echo "DB connect FAILED"
else
  echo "MISSING $ROOT/backend/.env"
fi

echo ""
echo "=== 7. Alembic ==="
cd "$ROOT/backend" && source .venv/bin/activate 2>/dev/null && alembic current 2>/dev/null || true

echo ""
echo "=== 8. systemd paths (must match repo) ==="
grep -E 'WorkingDirectory|ExecStart|EnvironmentFile' /etc/systemd/system/blockhub-api.service 2>/dev/null || true
echo "Expected WorkingDirectory: $ROOT/backend"

echo ""
echo "=== Fix hints ==="
echo "  sudo sed -i \"s|BLOCKHUB_ROOT|$ROOT|g\" /etc/systemd/system/blockhub-api.service"
echo "  sudo systemctl daemon-reload && sudo systemctl restart blockhub-api"
echo "  journalctl -u blockhub-api -f"
