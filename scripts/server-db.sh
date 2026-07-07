#!/usr/bin/env bash
# BlockHub 一键数据库：启动 PG/Redis → 修复漂移 → 迁移到最新 → 校验表结构 → 重启 API
#
# 用法（在服务器 ~/blockhub 执行）:
#   bash scripts/server-db.sh
#   bash scripts/server-db.sh --no-restart   # 只迁移，不重启 API
#
# 适用场景:
#   - 首次部署建库
#   - git pull 后有新 migration（当前 head=009 知识库+pgvector）
#   - alembic 版本与真实表不一致
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NO_RESTART=false
for arg in "$@"; do
  case "$arg" in
    --no-restart) NO_RESTART=true ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

if [ ! -f "$ROOT/backend/.env" ]; then
  echo "ERROR: backend/.env 不存在"
  echo "  cp backend/.env.example backend/.env && nano backend/.env"
  exit 1
fi

echo "=============================================="
echo " BlockHub 数据库一键更新"
echo " 目录: $ROOT"
echo "=============================================="

echo ""
echo ">>> [1/4] 启动 PostgreSQL + Redis（Docker）"
docker compose up -d postgres redis 2>/dev/null || true
sleep 2

echo ""
echo ">>> [2/4] 修复漂移 + alembic upgrade head"
bash "$ROOT/scripts/repair-db.sh"

echo ""
echo ">>> [3/4] 校验 schema（009 知识库 + pgvector）"
cd "$ROOT/backend"
source .venv/bin/activate
python3 <<'PY'
from sqlalchemy import inspect, text
from app.db.session import engine

insp = inspect(engine)
checks = [
    ("knowledge_bases", insp.has_table("knowledge_bases")),
    ("kb_documents", insp.has_table("kb_documents")),
    ("kb_document_chunks", insp.has_table("kb_document_chunks")),
    ("apps.plaza_visibility", insp.has_table("apps") and "plaza_visibility" in {c["name"] for c in insp.get_columns("apps")}),
]
for name, ok in checks:
    print(f"  {'✓' if ok else '✗'} {name}")

with engine.connect() as conn:
    ext = conn.execute(text("SELECT 1 FROM pg_extension WHERE extname='vector'")).fetchone()
    print(f"  {'✓' if ext else '✗'} pgvector extension")

missing = [n for n, ok in checks if not ok]
if missing:
    raise SystemExit(f"FAIL: 缺少表/列: {', '.join(missing)} — 请检查 alembic upgrade head")
if not ext:
    raise SystemExit("FAIL: pgvector 未安装 — 请使用 pgvector/pgvector:pg16 镜像或手动 CREATE EXTENSION vector")
print("schema OK")
PY

if [ "$NO_RESTART" = false ]; then
  echo ""
  echo ">>> [4/4] 重启 API"
  sudo systemctl restart blockhub-api
  sleep 2
  curl -sf --max-time 5 http://127.0.0.1:8001/api/v1/health && echo " API health OK" || {
    echo "WARN: API health 失败 — journalctl -u blockhub-api -n 30"
    exit 1
  }
else
  echo ""
  echo ">>> [4/4] 跳过 API 重启 (--no-restart)"
fi

echo ""
echo "=============================================="
echo " 数据库更新完成"
echo " 当前版本: $(cd "$ROOT/backend" && source .venv/bin/activate && alembic current 2>/dev/null | tail -1)"
echo " 快速验库: bash scripts/smoke-db.sh"
echo " 全量冒烟: bash scripts/smoke-test.sh http://127.0.0.1:8001"
echo "=============================================="
