#!/usr/bin/env bash
# 积木仓 — 上海话语音 Agent 网页 + APK 一键打包部署
#
# 包含：全量网页部署(含弹幕秒开/B2B首页/HTML缓存版本) + 上海话专用测试 APK + 语音冒烟
#
# 用法（服务器 ~/blockhub 执行）:
#   bash scripts/deploy-shanghai-one.sh
#   PUBLIC_URL=http://101.32.209.251 bash scripts/deploy-shanghai-one.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PUBLIC_URL="${PUBLIC_URL:-http://101.32.209.251}"

echo "=============================================="
echo " 上海话语音 Agent · 网页 + APK 一键部署"
echo " 目录: $ROOT"
echo " 公网: $PUBLIC_URL"
echo "=============================================="
echo ""
echo "[1/3] 全量网页部署（HTML 缓存版本自动刷新）..."
bash "$ROOT/scripts/deploy-all.sh" --web-only "$@"

echo ""
echo "[2/3] 语音 API 冒烟..."
bash "$ROOT/scripts/smoke-voice-apk.sh" "$PUBLIC_URL" || {
  echo "WARN: 语音 API 冒烟未全通过，仍尝试打 APK..."
}

echo ""
echo "[3/3] 构建上海话专用测试 APK（VOICE_DEMO=1，打开即语音页）..."
set +e
PUBLIC_URL="$PUBLIC_URL" bash "$ROOT/scripts/build-shanghai-voice-apk.sh"
APK_STATUS=$?
set -e

if [ "$APK_STATUS" -ne 0 ]; then
  echo "ERROR: 上海话 APK 构建失败 — 见 /tmp/flutter-apk-build.log"
  exit "$APK_STATUS"
fi

bash "$ROOT/scripts/smoke-voice-apk.sh" "$PUBLIC_URL" || true

if [ -f /var/www/blockhub/home/version.txt ]; then
  echo ""
  echo "    home HTML version: $(tr -d '\n\r' < /var/www/blockhub/home/version.txt)"
fi

echo ""
echo "=============================================="
echo " 完成"
echo " 网页演示: $PUBLIC_URL/agents/shanghai-voice"
echo " APK 下载: $PUBLIC_URL/downloads/shanghai-voice.apk"
echo " 首页版本: $PUBLIC_URL/version.txt"
echo " 浏览器强刷: Ctrl+Shift+R"
echo "=============================================="
