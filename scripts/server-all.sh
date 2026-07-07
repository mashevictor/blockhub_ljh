#!/usr/bin/env bash
# BlockHub 服务器总入口：部署 / 数据库 / 冒烟（可单独或组合）
#
# 用法（在服务器 ~/blockhub 执行）:
#   bash scripts/server-all.sh              # 全量：部署 + 本机冒烟 + 公网冒烟
#   bash scripts/server-all.sh deploy       # 仅部署（git pull + build + nginx）
#   bash scripts/server-all.sh db          # 仅数据库迁移
#   bash scripts/server-all.sh smoke        # 仅接口冒烟
#   bash scripts/server-all.sh deploy db    # 部署 + 数据库（deploy 已含 migrate，一般不必）
#
# 环境变量:
#   PUBLIC_URL=http://101.32.209.251
#   WITH_APK=1 bash scripts/server-all.sh   # 部署时顺带打 APK
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUBLIC_URL="${PUBLIC_URL:-http://101.32.209.251}"

run_deploy() {
  if [ "${WITH_APK:-0}" = "1" ]; then
    bash "$ROOT/scripts/deploy-all.sh" --with-apk
  else
    bash "$ROOT/scripts/deploy-all.sh" --web-only
  fi
}

run_db() {
  bash "$ROOT/scripts/server-db.sh"
}

run_smoke() {
  echo ""
  echo ">>> 冒烟 [本机 API :8001]"
  bash "$ROOT/scripts/smoke-test.sh" "http://127.0.0.1:8001"
  echo ""
  echo ">>> 冒烟 [公网 Nginx $PUBLIC_URL]"
  bash "$ROOT/scripts/smoke-test.sh" "$PUBLIC_URL"
}

echo "=============================================="
echo " BlockHub server-all"
echo " 目录: $ROOT"
echo " 公网: $PUBLIC_URL"
echo "=============================================="

if [ $# -eq 0 ] || [ "${1:-}" = "all" ]; then
  run_deploy
  run_smoke
else
  for part in "$@"; do
    case "$part" in
      deploy) run_deploy ;;
      db) run_db ;;
      smoke) run_smoke ;;
      help|-h|--help)
        sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
      *)
        echo "未知参数: $part"
        echo "用法: bash scripts/server-all.sh [all|deploy|db|smoke ...]"
        exit 1
        ;;
    esac
  done
fi

echo ""
echo "=============================================="
echo " 完成"
echo " Home:         $PUBLIC_URL/"
echo " Admin:        $PUBLIC_URL/admin/login"
echo " 上海话语音:   $PUBLIC_URL/agents/shanghai-voice"
echo " 账号:         admin@trackchat.local / admin123"
echo " 仅修库:       bash scripts/server-db.sh"
echo " 仅冒烟:       bash scripts/server-all.sh smoke"
echo " 查 API 日志:  journalctl -u blockhub-api -f"
echo "=============================================="
