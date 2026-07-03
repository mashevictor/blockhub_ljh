#!/usr/bin/env bash
# BlockHub 服务器一键更新（在服务器 ~/blockhub 目录执行）
# 用法:
#   cd ~/blockhub && bash scripts/server-update.sh
#   PUBLIC_URL=http://101.32.209.251 bash scripts/server-update.sh
#
# 首次部署前请确保:
#   1. backend/.env 已配置 DATABASE_URL、JWT_SECRET
#   2. 可选: DEEPSEEK_API_KEY 或 LLM_API_KEY+LLM_BASE_URL（Chat 真 LLM）
#   3. PostgreSQL 已运行（docker compose up -d postgres 或系统 PG）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f "$ROOT/scripts/deploy.sh" ]; then
  echo "ERROR: 找不到 $ROOT/scripts/deploy.sh"
  echo "  当前目录: $(pwd)"
  echo "  请确认在仓库根目录执行，例如:"
  echo "    cd ~/blockhub"
  echo "    git pull origin main"
  echo "    ls scripts/deploy.sh"
  echo "  若仍无 scripts 目录，请重新 clone: git clone git@github.com:mashevictor/blockhub.git ~/blockhub"
  exit 1
fi

PUBLIC_URL="${PUBLIC_URL:-http://101.32.209.251}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trackchat.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

echo "=============================================="
echo " BlockHub 服务器一键更新"
echo " 目录: $ROOT"
echo " 公网: $PUBLIC_URL"
echo "=============================================="

if [ ! -f "$ROOT/backend/.env" ]; then
  echo ""
  echo "WARN: backend/.env 不存在，从 .env.example 复制后请编辑 DATABASE_URL / JWT_SECRET"
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  echo "      已创建 backend/.env — 请 nano backend/.env 后重新运行本脚本"
  exit 1
fi

echo ""
echo ">>> [1/3] 部署（git pull + migrate + build + nginx）"
bash "$ROOT/scripts/deploy.sh"

echo ""
echo ">>> [2/3] API 冒烟（本机经 :8001）"
bash "$ROOT/scripts/smoke-test.sh" "http://127.0.0.1:8001"

echo ""
echo ">>> [3/3] 公网冒烟（经 Nginx）"
bash "$ROOT/scripts/smoke-test.sh" "$PUBLIC_URL"

echo ""
echo "=============================================="
echo " 更新完成"
echo "----------------------------------------------"
echo " Home:  $PUBLIC_URL/"
echo " Admin: $PUBLIC_URL/admin/login"
echo " 账号:  $ADMIN_EMAIL / $ADMIN_PASSWORD"
echo "       employee@trackchat.local / emp123"
echo ""
echo " Chat 真 LLM: 在 backend/.env 配置 DEEPSEEK_API_KEY 后"
echo "              sudo systemctl restart blockhub-api"
echo " 查看日志:    journalctl -u blockhub-api -f"
echo "=============================================="
