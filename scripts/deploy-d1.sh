#!/usr/bin/env bash
# BlockHub 服务器 D1 更新脚本（在 ~/blockhub 执行）
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> git pull"
git pull origin main

echo "==> backend deps + migrate"
cd backend
source .venv/bin/activate
pip install -r requirements.txt -q

# 若之前用手动 create_all 建过表，先 stamp 再 upgrade
if python -c "from app.db.session import engine; from sqlalchemy import inspect; print('yes' if inspect(engine).has_table('users') else 'no')" | grep -q yes; then
  alembic stamp head 2>/dev/null || true
fi
alembic upgrade head

echo "==> restart API"
systemctl restart blockhub-api 2>/dev/null || echo "提示: 请手动重启 uvicorn"

echo "==> build frontends"
cd ../home
npm install --silent
npm run build
cd ../frontend
npm install --silent
npm run build

echo "==> copy static to /var/www"
mkdir -p /var/www/blockhub
rm -rf /var/www/blockhub/home /var/www/blockhub/admin
cp -r ../home/dist /var/www/blockhub/home
cp -r dist /var/www/blockhub/admin
chown -R www-data:www-data /var/www/blockhub

echo "==> reload nginx"
nginx -t && systemctl reload nginx

echo "Done. 访问 http://101.32.209.251/ 和 /admin/login"
