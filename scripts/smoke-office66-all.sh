#!/usr/bin/env bash
# 通用办公 66 · 一键：API + 交互冒烟
#
# 用法:
#   bash scripts/smoke-office66-all.sh https://blockhub.club
#   bash scripts/smoke-office66-all.sh http://127.0.0.1:8001
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-https://blockhub.club}"

echo ">>>> [1/2] API"
bash "$ROOT/scripts/smoke-office66.sh" "$BASE"
echo ""
echo ">>>> [2/2] UI / interaction"
# 从 API 脚本日志里不好拿 APP_ID，UI 脚本会自行 publish
bash "$ROOT/scripts/smoke-office66-ui.sh" "$BASE"
echo ""
echo "Office66 ALL smoke done."
