#!/usr/bin/env bash
# BlockHub 一键部署（在服务器 ~/blockhub 目录执行，需 sudo）
# 用法: bash scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> [0/9] 基础设施 (pgvector + redis)"
bash "$ROOT/scripts/setup-pgvector.sh" || {
  echo "WARN: pgvector setup failed — migration 009 may fail"
}
bash "$ROOT/scripts/setup-redis.sh" || {
  echo "WARN: redis setup failed — rate limit uses in-memory fallback"
}
if command -v docker >/dev/null 2>&1; then
  docker compose up -d postgres redis 2>/dev/null || true
fi

echo "=========================================="
echo " BlockHub Deploy"
echo " Git: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "=========================================="

echo "==> [1/9] git pull (discard local lockfile & generated preview drift)"
# 注意：.g.dart 已纳入版本库，禁止 rm（会导致 APK 编译缺文件）。
# 未跟踪冲突由 scripts/lib/git-pull.sh 按需清理。
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/git-pull.sh"
blockhub_git_pull main
echo "    now at $(git rev-parse --short HEAD)"
# pull 后若工作区缺 codegen，从 HEAD 恢复
git checkout HEAD -- \
  runtime-app/lib/melos_capability_registry.g.dart \
  runtime-app/lib/capability_deferred_loader.g.dart \
  2>/dev/null || true

echo "==> [2/9] backend dependencies"
cd backend
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt -q

echo "==> [3/9] alembic migrate (target: head)"
bash "$ROOT/scripts/repair-db.sh" || {
  echo "    WARN: repair-db had issues; trying direct alembic upgrade..."
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
source .venv/bin/activate
python3 <<'PY'
from sqlalchemy import inspect
from app.db.session import engine

insp = inspect(engine)
tables = ["demo_bookings", "plaza_feed_likes", "notifications"]
for t in tables:
    print(f"    table {t}: {'OK' if insp.has_table(t) else 'MISSING'}")
if not insp.has_table("demo_bookings"):
    raise SystemExit("ERROR: demo_bookings 表缺失 — 预约无法入库，请检查 alembic upgrade head")
print("    预约表 demo_bookings 已就绪（用户提交时 API 自动写入，无需手工插数据）")
PY

echo "==> [4/9] systemd + nginx config (paths → $ROOT)"
if [ -f "$ROOT/scripts/blockhub-api.service" ]; then
  sed "s|BLOCKHUB_ROOT|$ROOT|g" "$ROOT/scripts/blockhub-api.service" | sudo tee /etc/systemd/system/blockhub-api.service >/dev/null
  sudo systemctl daemon-reload
fi
if [ -f "$ROOT/scripts/nginx-blockhub.conf" ]; then
  sed "s|BLOCKHUB_ROOT|$ROOT|g" "$ROOT/scripts/nginx-blockhub.conf" | sudo tee /etc/nginx/sites-available/blockhub >/dev/null
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
# shellcheck disable=SC1091
source "$ROOT/scripts/lib/npm-build-env.sh"
npm_prepare_build_env

STOPPED_API_FOR_BUILD=false
if npm_should_stop_api_for_build; then
  echo "    low memory — pausing blockhub-api during frontend build"
  if systemctl is-active --quiet blockhub-api 2>/dev/null; then
    sudo systemctl stop blockhub-api
    STOPPED_API_FOR_BUILD=true
    sleep 2
  fi
fi

npm_run_build "$ROOT/home" home
npm_run_build "$ROOT/frontend" admin
npm_run_build "$ROOT/runtime-web" runtime

if [ "$STOPPED_API_FOR_BUILD" = true ]; then
  npm_restart_api_after_build
fi

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

for app in home admin; do
  VER_FILE="$ROOT/$app/dist/version.txt"
  if [ -f "$VER_FILE" ]; then
    echo "    $app html cache version: $(tr -d '\n\r' < "$VER_FILE")"
  fi
done

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

if [ -f /var/www/blockhub/admin/index.html ]; then
  if grep -q 'id="root"' /var/www/blockhub/admin/index.html 2>/dev/null; then
    echo "    admin index.html OK"
  else
    echo "ERROR: admin index.html invalid — rebuild frontend"
    exit 1
  fi
else
  echo "ERROR: /var/www/blockhub/admin/index.html missing"
  exit 1
fi

if [ -f /var/www/blockhub/home/version.txt ]; then
  echo "    deployed home version: $(tr -d '\n\r' < /var/www/blockhub/home/version.txt)"
  if grep -q 'app-build-version' /var/www/blockhub/home/index.html 2>/dev/null; then
    echo "    home index.html cache meta: OK"
  fi
fi

if [ -f /var/www/blockhub/home/downloads/one-pager-mfg.html ]; then
  echo "    downloads/one-pager-mfg.html: OK"
else
  echo "WARN: home/downloads/ 缺失 — 请确认 home 构建包含 public/downloads"
fi

echo ""
echo "==> [9/9] seed + smoke (catalog + demo booking API)"
bash "$ROOT/scripts/smoke-test.sh" "${SMOKE_BASE_URL:-http://127.0.0.1}" --seed-only || {
  echo "WARN: seed-only failed; try: curl -X POST .../seed -d '{\"force\":true}'"
}

DEMO_RESP="$(curl -sf --max-time 8 -X POST http://127.0.0.1:8001/api/v1/demo-bookings \
  -H "Content-Type: application/json" \
  -d '{"contact":"deploy-check@blockhub.local","salutation":"部署检测","company_name":"自动验收","source":"deploy"}' 2>/dev/null || true)"
if echo "$DEMO_RESP" | grep -q '"ok"'; then
  echo "    demo-bookings API: OK"
else
  echo "WARN: demo-bookings API 未通过 — 预约可能无法入库"
  echo "    response: ${DEMO_RESP:-empty}"
fi

echo ""
echo "=========================================="
echo " Deploy complete!"
echo " Home:  http://101.32.209.251/"
echo " Admin: http://101.32.209.251/admin/login"
if [ -f /var/www/blockhub/home/version.txt ]; then
  echo " HTML version: $(tr -d '\n\r' < /var/www/blockhub/home/version.txt)"
  echo " 浏览器强刷: Ctrl+Shift+R 或访问 /version.txt 核对版本"
fi
echo " 预约数据表: demo_bookings (API 自动写入，无需手工 SQL)"
echo " Full smoke: bash scripts/smoke-test.sh http://101.32.209.251"
echo "=========================================="
