#!/usr/bin/env bash
# BlockHub 一键部署（在服务器 ~/blockhub 目录执行，需 sudo）
# 用法: bash scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=========================================="
echo " BlockHub Deploy"
echo " Git: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "=========================================="

echo "==> [1/9] git pull (discard local lockfile drift)"
git fetch origin
git checkout -- home/package-lock.json 2>/dev/null || true
git pull origin main
echo "    now at $(git rev-parse --short HEAD)"

echo "==> [2/9] backend dependencies"
cd backend
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt -q

echo "==> [3/9] alembic migrate (target: 004 hero presets)"
# 仅当从未跑过 alembic、但已有旧表时，stamp 到 001 再升级（勿 stamp head）
if ! alembic current 2>/dev/null | grep -qE '[0-9a-f]+|001|002|003|004'; then
  if python -c "from app.db.session import engine; from sqlalchemy import inspect; print('yes' if inspect(engine).has_table('users') else 'no')" 2>/dev/null | grep -q yes; then
    echo "    legacy DB detected → alembic stamp 001"
    alembic stamp 001
  fi
fi
alembic upgrade head
alembic current

echo "==> [4/9] systemd + nginx config"
if [ -f "$ROOT/scripts/blockhub-api.service" ]; then
  sudo cp "$ROOT/scripts/blockhub-api.service" /etc/systemd/system/
  sudo systemctl daemon-reload
fi
if [ -f "$ROOT/scripts/nginx-blockhub.conf" ]; then
  sudo cp "$ROOT/scripts/nginx-blockhub.conf" /etc/nginx/sites-available/blockhub
  sudo ln -sf /etc/nginx/sites-available/blockhub /etc/nginx/sites-enabled/blockhub 2>/dev/null || true
fi

echo "==> [5/9] restart API"
sudo systemctl enable blockhub-api 2>/dev/null || true
sudo systemctl restart blockhub-api
sleep 3

echo "==> [6/9] build frontends"
cd "$ROOT/home"
npm install --silent
npm run build
cd "$ROOT/frontend"
npm install --silent
npm run build

echo "==> [7/9] copy static files"
sudo mkdir -p /var/www/blockhub/home /var/www/blockhub/admin
sudo rm -rf /var/www/blockhub/home/* /var/www/blockhub/admin/*
sudo cp -r "$ROOT/home/dist/." /var/www/blockhub/home/
sudo cp -r "$ROOT/frontend/dist/." /var/www/blockhub/admin/
sudo chown -R www-data:www-data /var/www/blockhub

echo "==> [8/9] reload nginx"
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "==> [9/9] seed + smoke (catalog 114 + hero 30 + chips 5)"
bash "$ROOT/scripts/smoke-test.sh" "${SMOKE_BASE_URL:-http://127.0.0.1}" --seed-only || {
  echo "WARN: seed-only failed; try: curl -X POST .../seed -d '{\"force\":true}'"
}

echo ""
echo "=========================================="
echo " Deploy complete!"
echo " Home:  http://101.32.209.251/"
echo " Admin: http://101.32.209.251/admin/login"
echo " Full smoke: bash scripts/smoke-test.sh http://101.32.209.251"
echo "=========================================="
