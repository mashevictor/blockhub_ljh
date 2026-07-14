#!/usr/bin/env bash
# 上海话语音助手 · 真项目一键交付（网页 + 语音冒烟 + APK + 静态下载位）
#
# 服务器 ~/blockhub 执行:
#   bash scripts/ship-shanghai-project.sh
#   SKIP_APK=1 bash scripts/ship-shanghai-project.sh          # 仅网页+冒烟
#   PUBLIC_URL=http://101.32.209.251 bash scripts/ship-shanghai-project.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PUBLIC_URL="${PUBLIC_URL:-http://101.32.209.251}"
SKIP_APK="${SKIP_APK:-0}"
PROJECT_JSON="$ROOT/projects/shanghai-voice/project.json"

echo "=============================================="
echo " 上海话语音助手 · 真项目交付"
echo " 目录: $ROOT"
echo " 公网: $PUBLIC_URL"
echo " 清单: $PROJECT_JSON"
echo "=============================================="

if [ ! -f "$PROJECT_JSON" ]; then
  echo "ERROR: 缺少 projects/shanghai-voice/project.json"
  exit 1
fi

# 部署前丢掉服务器对 lock 的本地漂移，避免 pull/merge 失败
echo ""
echo "[0/6] 清理 git lock 漂移..."
git checkout -- home/package-lock.json frontend/package-lock.json 2>/dev/null || true
if [ "${SKIP_GIT_PULL:-0}" != "1" ]; then
  git fetch origin 2>/dev/null || true
  git pull origin main 2>/dev/null || git pull 2>/dev/null || true
fi
echo "    HEAD: $(git rev-parse --short HEAD 2>/dev/null || echo '?')"

echo ""
echo "[1/6] 后端语音配置检查..."
if [ -f backend/.env ]; then
  if grep -qE '^TELEAI_APP_ID=.+' backend/.env && grep -qE '^TELEAI_APP_KEY=.+' backend/.env; then
    echo "    OK  TELEAI_* 已配置"
  else
    echo "    WARN backend/.env 缺少 TELEAI_APP_ID / TELEAI_APP_KEY — 语音链路会降级"
  fi
else
  echo "    WARN 无 backend/.env — 请从 env 模板复制并填写 TELEAI_* / DEEPSEEK_*"
fi

echo ""
echo "[2/6] 部署网页（home/admin/runtime + HTML 缓存版本）..."
bash "$ROOT/scripts/deploy-all.sh" --web-only "$@"

echo ""
echo "[3/6] 语音 API 冒烟..."
set +e
bash "$ROOT/scripts/smoke-voice-apk.sh" "$PUBLIC_URL"
SMOKE1=$?
set -e
if [ "$SMOKE1" -ne 0 ]; then
  echo "    WARN 语音冒烟未全绿，继续后续步骤（检查 TELEAI / systemctl restart blockhub-api）"
fi

echo ""
echo "[4/6] 静态下载位（网页演示模板 + APK 目录）..."
mkdir -p backend/uploads/apks /var/www/blockhub/downloads 2>/dev/null || mkdir -p backend/uploads/apks
if [ -f templates/shanghai-voice-web.html ]; then
  cp -f templates/shanghai-voice-web.html /var/www/blockhub/downloads/shanghai-voice.html 2>/dev/null \
    || cp -f templates/shanghai-voice-web.html backend/uploads/apks/shanghai-voice.html
  echo "    OK  shanghai-voice.html"
fi
# 项目清单供运维核对
cp -f "$PROJECT_JSON" /var/www/blockhub/downloads/shanghai-voice.project.json 2>/dev/null \
  || cp -f "$PROJECT_JSON" backend/uploads/apks/shanghai-voice.project.json
echo "    OK  shanghai-voice.project.json"

if [ "$SKIP_APK" = "1" ]; then
  echo ""
  echo "[5/6] SKIP_APK=1 — 跳过 Flutter APK"
else
  echo ""
  echo "[5/6] 构建上海话专用 APK（VOICE_DEMO=1）..."
  set +e
  PUBLIC_URL="$PUBLIC_URL" bash "$ROOT/scripts/build-shanghai-voice-apk.sh"
  APK_STATUS=$?
  set -e
  if [ "$APK_STATUS" -ne 0 ]; then
    echo "ERROR: APK 构建失败 — 见 /tmp/flutter-apk-build.log"
    exit "$APK_STATUS"
  fi
  if [ -f backend/uploads/apks/shanghai-voice.apk ]; then
    chmod a+r backend/uploads/apks/shanghai-voice.apk 2>/dev/null || true
    mkdir -p /var/www/blockhub/downloads 2>/dev/null || true
    cp -f backend/uploads/apks/shanghai-voice.apk /var/www/blockhub/downloads/shanghai-voice.apk 2>/dev/null || true
    chmod a+r /var/www/blockhub/downloads/shanghai-voice.apk 2>/dev/null || true
    # 确保 nginx worker 能读 uploads（常见 403 原因）
    chmod a+rx backend/uploads backend/uploads/apks 2>/dev/null || true
    echo "    OK  /downloads/shanghai-voice.apk"
  fi
fi

echo ""
echo "[6/6] 验收链接..."
set +e
bash "$ROOT/scripts/smoke-voice-apk.sh" "$PUBLIC_URL" || true
HOME_VER="$(curl -sf --max-time 5 "$PUBLIC_URL/version.txt" 2>/dev/null || true)"
VOICE_PAGE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$PUBLIC_URL/agents/shanghai-voice" 2>/dev/null || echo 000)"
set -e

echo ""
echo "=============================================="
echo " 交付完成 · 上海话语音助手"
echo "  Git HEAD : $(git rev-parse --short HEAD 2>/dev/null || echo '?')"
echo "  HTML 版本: ${HOME_VER:-（请强刷后打开 /version.txt）}"
echo "  网页演示 : $PUBLIC_URL/agents/shanghai-voice  (HTTP $VOICE_PAGE)"
echo "  我的应用 : $PUBLIC_URL/plaza/my  （自动写入「上海话语音助手」）"
echo "  APK 下载 : $PUBLIC_URL/downloads/shanghai-voice.apk"
echo "  项目清单 : $PUBLIC_URL/downloads/shanghai-voice.project.json"
echo "  浏览器   : Ctrl+Shift+R 强刷"
echo "=============================================="
