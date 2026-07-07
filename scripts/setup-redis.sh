#!/usr/bin/env bash
# 确保 Redis 在 6379 可用（限流 + health 检查）
#
# 用法: bash scripts/setup-redis.sh
# 无 Docker 时安装系统 redis-server；有 Docker 时启动 trackchat-redis 容器
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REDIS_URL="${REDIS_URL:-}"
if [ -z "$REDIS_URL" ] && [ -f "$ROOT/backend/.env" ]; then
  # shellcheck disable=SC1091
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^REDIS_URL=' "$ROOT/backend/.env" | sed 's/^/export /')
  set +a
fi
REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379/0}"
echo "REDIS_URL → ${REDIS_URL%%@*}@***"

redis_ping() {
  if command -v redis-cli >/dev/null 2>&1; then
    redis-cli -u "$REDIS_URL" ping 2>/dev/null | grep -q PONG && return 0
  fi
  python3 -c "
import redis
r = redis.from_url('$REDIS_URL', socket_connect_timeout=2)
print(r.ping())
" 2>/dev/null | grep -q True
}

echo ""
echo ">>> [1] 检查 Redis"
if redis_ping; then
  echo "✓ Redis 已可用"
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  echo ">>> [2] 启动 Docker redis..."
  docker compose pull redis 2>/dev/null || true
  docker compose up -d redis
  sleep 2
  if redis_ping; then
    echo "✓ Docker Redis 已启动"
    exit 0
  fi
fi

echo ">>> [2] 安装/启动系统 redis-server..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y redis-server
  sudo systemctl enable redis-server 2>/dev/null || sudo systemctl enable redis 2>/dev/null || true
  sudo systemctl restart redis-server 2>/dev/null || sudo systemctl restart redis 2>/dev/null || true
  sleep 1
fi

if redis_ping; then
  echo "✓ 系统 Redis 已启动"
  echo ""
  echo "提示: 若 health 仍显示 unavailable，重启 API 以刷新连接缓存:"
  echo "  sudo systemctl restart blockhub-api"
  exit 0
fi

echo ""
echo "ERROR: Redis 仍不可用"
echo "  ss -tlnp | grep 6379"
echo "  redis-cli ping"
echo "  确认 backend/.env: REDIS_URL=redis://127.0.0.1:6379/0"
exit 1
