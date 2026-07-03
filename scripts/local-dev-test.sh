#!/usr/bin/env bash
# 本地开发环境一键准备 + 冒烟（需 Docker PostgreSQL）
# 用法: bash scripts/local-dev-test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> start postgres"
docker compose up -d postgres redis
echo "waiting for postgres..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U trackchat -d trackchat >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

cd backend
if [ ! -d .venv ]; then python3 -m venv .venv; fi
source .venv/bin/activate
pip install -r requirements.txt -q

if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || true
fi

echo "==> alembic upgrade"
alembic upgrade head

echo "==> start API (background)"
pkill -f "uvicorn app.main:app" 2>/dev/null || true
uvicorn app.main:app --host 127.0.0.1 --port 8001 &
API_PID=$!
sleep 3

echo "==> smoke test"
bash "$ROOT/scripts/smoke-test.sh" http://127.0.0.1:8001
RESULT=$?

kill $API_PID 2>/dev/null || true
exit $RESULT
