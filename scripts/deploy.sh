#!/usr/bin/env bash
# BlockHub 一键部署（在服务器 ~/blockhub 目录执行，需 sudo）
# 用法: bash scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=========================================="
echo " BlockHub Deploy"
echo "=========================================="

echo "==> [1/8] git pull"
git pull origin main

echo "==> [2/8] backend dependencies"
cd backend
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt -q

echo "==> [3/8] alembic migrate"
if python -c "from app.db.session import engine; from sqlalchemy import inspect; print('yes' if inspect(engine).has_table('users') else 'no')" 2>/dev/null | grep -q yes; then
  alembic stamp head 2>/dev/null || true
fi
alembic upgrade head

echo "==> [4/8] systemd + nginx config"
if [ -f "$ROOT/scripts/blockhub-api.service" ]; then
  sudo cp "$ROOT/scripts/blockhub-api.service" /etc/systemd/system/
  sudo systemctl daemon-reload
fi
if [ -f "$ROOT/scripts/nginx-blockhub.conf" ]; then
  sudo cp "$ROOT/scripts/nginx-blockhub.conf" /etc/nginx/sites-available/blockhub
  sudo ln -sf /etc/nginx/sites-available/blockhub /etc/nginx/sites-enabled/blockhub 2>/dev/null || true
fi

echo "==> [5/8] restart API"
sudo systemctl enable blockhub-api 2>/dev/null || true
sudo systemctl restart blockhub-api
sleep 2

echo "==> [6/8] build frontends"
cd "$ROOT/home"
npm install --silent
npm run build
cd "$ROOT/frontend"
npm install --silent
npm run build

echo "==> [7/8] copy static files"
sudo mkdir -p /var/www/blockhub/home /var/www/blockhub/admin
sudo rm -rf /var/www/blockhub/home/* /var/www/blockhub/admin/*
sudo cp -r "$ROOT/home/dist/." /var/www/blockhub/home/
sudo cp -r "$ROOT/frontend/dist/." /var/www/blockhub/admin/
sudo chown -R www-data:www-data /var/www/blockhub

echo "==> [8/8] reload nginx"
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "==> seed catalog (via API)"
bash "$ROOT/scripts/smoke-test.sh" "${SMOKE_BASE_URL:-http://127.0.0.1}" --seed-only || true

echo ""
echo "=========================================="
echo " Deploy complete!"
echo " Home:  http://101.32.209.251/"
echo " Admin: http://101.32.209.251/admin/login"
echo " Run full smoke: bash scripts/smoke-test.sh http://101.32.209.251"
echo "=========================================="
