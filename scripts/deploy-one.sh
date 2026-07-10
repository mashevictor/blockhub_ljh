#!/usr/bin/env bash
# 积木仓 BlockHub — 网页一键部署（服务器 ~/blockhub 目录执行）
#
# 包含：拉代码 → 数据库迁移 → 构建 home/admin/runtime(自动刷新 HTML 缓存版本) → Nginx → 重启 API
#
# 用法:
#   bash scripts/deploy-one.sh
#
# 上海话网页+APK 请用:
#   bash scripts/deploy-shanghai-one.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=============================================="
echo " 积木仓 BlockHub 一键部署"
echo " 目录: $ROOT"
echo "=============================================="
echo ""
echo "将执行: 清缓存 → git pull → 数据库迁移 → 构建 → 发布静态站 → 重启 API"
echo "预约数据: 迁移自动建表 demo_bookings，用户提交后 API 自动保存，无需手工 INSERT"
echo ""

exec bash "$ROOT/scripts/deploy-all.sh" --web-only "$@"
