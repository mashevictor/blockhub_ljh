#!/usr/bin/env bash
# BlockHub 一键部署（在服务器 ~/blockhub 目录执行，需 sudo）
# 用法: bash scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> [0/9] docker compose (postgres + redis)"
docker compose up -d postgres redis 2>/dev/null || true

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
bash "$ROOT/scripts/repair-db.sh" || {
  echo "    repair-db skipped or failed; trying direct upgrade..."
  cd "$ROOT/backend"
  source .venv/bin/activate
  if ! alembic current 2>/dev/null | grep -qE '[0-9a-f]+|001|002|003|004|005'; then
    if python -c "from app.db.session import engine; from sqlalchemy import inspect; print('yes' if inspect(engine).has_table('users') else 'no')" 2>/dev/null | grep -q yes; then
      echo "    legacy DB detected → alembic stamp 001"
      alembic stamp 001
    fi
  fi
  alembic upgrade head
  alembic current
}
cd "$ROOT/backend"

echo "==> [4/9] systemd + nginx config (paths → $ROOT)"
if [ -f "$ROOT/scripts/blockhub-api.service" ]; then
  sed "s|BLOCKHUB_ROOT|$ROOT|g" "$ROOT/scripts/blockhub-api.service" | sudo tee /etc/systemd/system/blockhub-api.service >/dev/null
  sudo systemctl daemon-reload
fi
if [ -f "$ROOT/scripts/nginx-blockhub.conf" ]; then
  sudo cp "$ROOT/scripts/nginx-blockhub.conf" /etc/nginx/sites-available/blockhub
  sudo ln -sf /etc/nginx/sites-available/blockhub /etc/nginx/sites-enabled/blockhub 2>/dev/null || true
fi

echo "==> [5/9] restart API"
sudo systemctl enable blockhub-api 2>/dev/null || true
sudo systemctl restart blockhub-api
echo "    waiting for API health..."
API_OK=false
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf --max-time 3 http://127.0.0.1:8001/api/v1/health >/dev/null 2>&1; then
    API_OK=true
    echo "    API health OK (attempt $i)"
    break
  fi
  sleep 2
done
if [ "$API_OK" != true ]; then
  echo "ERROR: API not responding on :8001 — run: bash scripts/diagnose-api.sh"
  journalctl -u blockhub-api -n 30 --no-pager 2>/dev/null || true
  exit 1
fi

echo "==> [6/9] build frontends"
cd "$ROOT/home"
npm install --silent
npm run build
cd "$ROOT/frontend"
npm install --silent
npm run build
cd "$ROOT/runtime-web"
npm install --silent
npm run build

echo "==> [7/9] copy static files (atomic, verify bundles)"
STAGE="$(mktemp -d /tmp/blockhub-stage.XXXXXX)"
mkdir -p "$STAGE/home" "$STAGE/admin" "$STAGE/r"
cp -r "$ROOT/home/dist/." "$STAGE/home/"
cp -r "$ROOT/frontend/dist/." "$STAGE/admin/"
cp -r "$ROOT/runtime-web/dist/." "$STAGE/r/"

ADMIN_JS="$(find "$STAGE/admin/assets" -maxdepth 1 -name 'index-*.js' 2>/dev/null | head -1)"
HOME_JS="$(find "$STAGE/home/assets" -maxdepth 1 -name 'index-*.js' 2>/dev/null | head -1)"
RUNTIME_JS="$(find "$STAGE/r/assets" -maxdepth 1 -name 'index-*.js' 2>/dev/null | head -1)"
if [ -z "$ADMIN_JS" ] || [ ! -s "$ADMIN_JS" ]; then
  echo "ERROR: admin JS bundle missing or empty — abort deploy"
  rm -rf "$STAGE"
  exit 1
fi
if [ -z "$HOME_JS" ] || [ ! -s "$HOME_JS" ]; then
  echo "ERROR: home JS bundle missing or empty — abort deploy"
  rm -rf "$STAGE"
  exit 1
fi
if [ -z "$RUNTIME_JS" ] || [ ! -s "$RUNTIME_JS" ]; then
  echo "ERROR: runtime-web JS bundle missing or empty — abort deploy"
  rm -rf "$STAGE"
  exit 1
fi
echo "    admin js: $(basename "$ADMIN_JS") ($(wc -c < "$ADMIN_JS") bytes)"
echo "    home js:  $(basename "$HOME_JS") ($(wc -c < "$HOME_JS") bytes)"
echo "    runtime js: $(basename "$RUNTIME_JS") ($(wc -c < "$RUNTIME_JS") bytes)"

sudo mkdir -p /var/www/blockhub
sudo rm -rf /var/www/blockhub/home.old /var/www/blockhub/admin.old /var/www/blockhub/r.old
sudo mv /var/www/blockhub/home /var/www/blockhub/home.old 2>/dev/null || true
sudo mv /var/www/blockhub/admin /var/www/blockhub/admin.old 2>/dev/null || true
sudo mv /var/www/blockhub/r /var/www/blockhub/r.old 2>/dev/null || true
sudo mv "$STAGE/home" /var/www/blockhub/home
sudo mv "$STAGE/admin" /var/www/blockhub/admin
sudo mv "$STAGE/r" /var/www/blockhub/r
sudo rm -rf /var/www/blockhub/home.old /var/www/blockhub/admin.old /var/www/blockhub/r.old
sudo chown -R www-data:www-data /var/www/blockhub
rmdir "$STAGE" 2>/dev/null || true

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
