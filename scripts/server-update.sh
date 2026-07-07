#!/usr/bin/env bash
# BlockHub 服务器一键更新（推荐入口，等同 server-all.sh all）
#
# 用法:
#   cd ~/blockhub && bash scripts/server-update.sh
#   PUBLIC_URL=http://101.32.209.251 bash scripts/server-update.sh
#
# 分拆命令:
#   bash scripts/server-all.sh deploy   # 仅部署
#   bash scripts/server-all.sh db       # 仅数据库
#   bash scripts/server-all.sh smoke    # 仅冒烟
#
# 首次部署前:
#   1. backend/.env 配置 DATABASE_URL、JWT_SECRET
#   2. 可选 TELEAI_APP_ID/KEY（上海话）、EMBEDDING_API_KEY（向量检索）
#   3. docker compose up -d postgres redis
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/scripts/server-all.sh" all "$@"
