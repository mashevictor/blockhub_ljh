#!/usr/bin/env bash
# 确保 PostgreSQL 已安装 pgvector 扩展（009 知识库迁移依赖）
#
# 用法: bash scripts/setup-pgvector.sh
#
# 常见原因:
#   - DATABASE_URL 连的是系统自带 PostgreSQL（无 pgvector）
#   - Docker 仍用旧镜像 postgres:16-alpine
#   - 5432 被系统 PG 占用，Docker 容器其实没起来
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=========================================="
echo " BlockHub pgvector 检查 / 修复"
echo "=========================================="

if [ ! -f "$ROOT/backend/.env" ]; then
  echo "ERROR: backend/.env 不存在"
  exit 1
fi

# shellcheck disable=SC1091
set -a
# shellcheck disable=SC1090
source <(grep -E '^DATABASE_URL=' "$ROOT/backend/.env" | sed 's/^/export /')
set +a

DB_URL="${DATABASE_URL:-postgresql+psycopg2://trackchat:trackchat@127.0.0.1:5432/trackchat}"
echo "DATABASE_URL → ${DB_URL%%@*}@***"

vector_ok() {
  cd "$ROOT/backend"
  # shellcheck disable=SC1091
  source .venv/bin/activate 2>/dev/null || true
  python3 <<'PY' 2>/dev/null
from sqlalchemy import text
from app.db.session import engine
with engine.begin() as conn:
    avail = conn.execute(text("SELECT 1 FROM pg_available_extensions WHERE name='vector'")).fetchone()
    if not avail:
        raise SystemExit(1)
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
print("ok")
PY
}

echo ""
echo ">>> [1] 检查 5432 端口占用"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep ':5432' || echo "    (5432 无监听 — 将启动 Docker postgres)"
elif command -v netstat >/dev/null 2>&1; then
  netstat -tlnp 2>/dev/null | grep ':5432' || true
fi

DOCKER_PG=false
if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^trackchat-postgres$'; then
    DOCKER_PG=true
    IMG=$(docker inspect trackchat-postgres --format '{{.Config.Image}}' 2>/dev/null || echo "")
    echo "    Docker trackchat-postgres 镜像: $IMG"
    if [[ "$IMG" != *"pgvector"* ]]; then
      echo "    WARN: 镜像不含 pgvector，将重建容器..."
      docker compose stop postgres 2>/dev/null || true
      docker compose rm -f postgres 2>/dev/null || true
      docker compose pull postgres
      docker compose up -d postgres
      sleep 5
      DOCKER_PG=true
    fi
  else
    echo "    Docker 已安装，但 trackchat-postgres 未运行"
  fi
else
  echo "    未安装 Docker — 使用系统 PostgreSQL（需 postgresql-16-pgvector 包）"
fi

if vector_ok; then
  echo ""
  echo "✓ pgvector 已可用，无需修复"
  exit 0
fi

echo ""
echo ">>> [2] pgvector 不可用，尝试修复..."

# 方案 A：Docker pgvector 镜像（仅当已安装 docker）
if command -v docker >/dev/null 2>&1; then
  echo "    启动/重建 Docker postgres (pgvector/pgvector:pg16)..."
  docker compose pull postgres 2>/dev/null || true
  docker compose up -d postgres
  sleep 5

  if vector_ok; then
    echo "✓ Docker pgvector 修复成功"
    exit 0
  fi
fi

# 方案 B：系统 PostgreSQL 安装 pgvector 包
echo "    尝试 apt 安装 postgresql-16-pgvector ..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -qq
  if sudo apt-get install -y postgresql-16-pgvector 2>/dev/null; then
    sudo systemctl restart postgresql 2>/dev/null || sudo systemctl restart postgresql@16-main 2>/dev/null || true
    sleep 2
    if vector_ok; then
      echo "✓ 系统 PostgreSQL pgvector 安装成功"
      exit 0
    fi
  fi
fi

echo ""
echo "ERROR: 仍无法启用 pgvector"
echo "  1. 确认 backend/.env 的 DATABASE_URL 指向有 pgvector 的实例"
echo "  2. docker compose ps"
echo "  3. 手动测试: psql -U trackchat -d trackchat -c \"CREATE EXTENSION vector;\""
exit 1
