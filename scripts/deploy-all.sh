#!/usr/bin/env bash
# BlockHub 一键：清缓存 + 网站部署 + 可选 APK 打包 + 恢复 API
#
# 用法（在服务器 /root/blockhub 执行）:
#   bash scripts/deploy-all.sh                 # 网站全量部署（默认）
#   bash scripts/deploy-all.sh --with-apk      # 网站 + APK（构建时会停 API，结束自动恢复）
#   bash scripts/deploy-all.sh --apk-only      # 只打 APK
#   bash scripts/deploy-all.sh --web-only      # 同默认
#   bash scripts/deploy-all.sh --no-cache      # 跳过清缓存
#   bash scripts/deploy-all.sh --restart-api   # 只重启 API（修 502）
#
# 环境变量:
#   APP_NAME=laoliu  ANDROID_HOME=/root/Android  GRADLE_LOW_MEM=1
#   PUBLIC_URL=http://101.32.209.251  SMOKE_BASE_URL=...
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DO_WEB=1
DO_APK=0
DO_CACHE=1
DO_RESTART_ONLY=0
APP_NAME="${APP_NAME:-TrackChat}"
PUBLIC_URL="${PUBLIC_URL:-http://101.32.209.251}"

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    -h|--help) usage ;;
    --with-apk) DO_APK=1 ;;
    --apk-only) DO_WEB=0; DO_APK=1 ;;
    --web-only) DO_APK=0 ;;
    --no-cache) DO_CACHE=0 ;;
    --restart-api) DO_RESTART_ONLY=1; DO_WEB=0; DO_APK=0 ;;
  esac
done

log() { echo ""; echo ">>> $*"; }

ensure_api_up() {
  log "同步 systemd + 确保 blockhub-api 运行"
  if [ -f "$ROOT/scripts/sync-systemd-api.sh" ]; then
    bash "$ROOT/scripts/sync-systemd-api.sh" || {
      sudo systemctl enable blockhub-api 2>/dev/null || true
      sudo systemctl restart blockhub-api
    }
  else
    sudo systemctl enable blockhub-api 2>/dev/null || true
    sudo systemctl restart blockhub-api
  fi
  local ok=false
  for i in $(seq 1 15); do
    if curl -sf --max-time 3 http://127.0.0.1:8001/api/v1/health >/dev/null 2>&1; then
      ok=true
      echo "    API health OK (attempt $i)"
      break
    fi
    sleep 2
  done
  if [ "$ok" != true ]; then
    echo "ERROR: API 未响应 :8001 → 502 Bad Gateway"
    echo "  运行: bash scripts/diagnose-api.sh"
    journalctl -u blockhub-api -n 40 --no-pager 2>/dev/null || true
    exit 1
  fi
}

refresh_caches() {
  log "[缓存] 刷新构建缓存"
  # git
  git fetch origin
  git checkout -- home/package-lock.json frontend/package-lock.json runtime-web/package-lock.json runtime-app/pubspec.lock 2>/dev/null || true

  # npm — 清 Vite 产物缓存，保留 node_modules 加速
  for dir in home frontend runtime-web; do
    if [ -d "$ROOT/$dir" ]; then
      rm -rf "$ROOT/$dir/node_modules/.vite" "$ROOT/$dir/dist" 2>/dev/null || true
      if [ -f "$ROOT/$dir/package-lock.json" ]; then
        (cd "$ROOT/$dir" && npm cache verify 2>/dev/null) || true
      fi
    fi
  done

  # python
  if [ -d "$ROOT/backend/.venv" ]; then
  # shellcheck disable=SC1091
    source "$ROOT/backend/.venv/bin/activate"
    pip cache purge 2>/dev/null || true
  fi

  # flutter / gradle 构建缓存（可选清理，避免占满磁盘）
  rm -rf "$ROOT/runtime-app/build" 2>/dev/null || true
  rm -rf /tmp/gradle-home-* /tmp/flutter-apk-build.log /tmp/gradle-assemble-release.log 2>/dev/null || true

  echo "    缓存刷新完成"
}

deploy_web() {
  log "[网站] git pull + 数据库 + 构建 + Nginx"
  bash "$ROOT/scripts/deploy.sh"
}

build_apk() {
  log "[APK] 打包（默认保持 API 运行；内存不足时 GRADLE_STOP_API_FOR_BUILD=1）"
  export ANDROID_HOME="${ANDROID_HOME:-/root/Android}"
  export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
  export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
  export PATH="/opt/flutter/bin:/root/flutter/bin:$ANDROID_HOME/platform-tools:${JAVA_HOME}/bin:$PATH"
  export FLUTTER_ROOT_ALLOW_ROOT=true
  export GRADLE_LOW_MEM="${GRADLE_LOW_MEM:-1}"

  set +e
  APP_NAME="$APP_NAME" bash "$ROOT/scripts/flutter-build-apk.sh"
  local apk_status=$?
  set -e

  if [ "$apk_status" -ne 0 ]; then
    echo "WARN: APK 构建失败 (exit $apk_status)"
    echo "  日志: /tmp/flutter-apk-build.log"
    echo "  若 OOM 可尝试: GRADLE_STOP_API_FOR_BUILD=1 bash scripts/deploy-all.sh --apk-only"
    return "$apk_status"
  fi
  echo "    APK OK → backend/uploads/apks/default.apk"
  return 0
}

post_smoke() {
  log "[验收] 冒烟测试"
  if curl -sf --max-time 5 "$PUBLIC_URL/api/v1/health" >/dev/null 2>&1; then
    echo "    公网 API: OK ($PUBLIC_URL/api/v1/health)"
  else
    echo "WARN: 公网 API 仍不可达 — bash scripts/diagnose-api.sh"
  fi
  bash "$ROOT/scripts/smoke-db.sh" "http://127.0.0.1:8001" || echo "    WARN: smoke-db 未全通过 — 见上方输出"
  if [ "${SKIP_CAPABILITY_SMOKE:-0}" != "1" ]; then
    bash "$ROOT/scripts/smoke-capability-contract.sh" "http://127.0.0.1:8001" \
      && echo "    capability contract: OK" \
      || echo "    WARN: smoke-capability-contract 未通过"
  fi
}

echo "=============================================="
echo " BlockHub deploy-all"
echo " 目录: $ROOT"
echo " web=$DO_WEB apk=$DO_APK cache=$DO_CACHE"
echo "=============================================="

if [ "$DO_RESTART_ONLY" -eq 1 ]; then
  ensure_api_up
  post_smoke
  exit 0
fi

if [ "$DO_CACHE" -eq 1 ]; then
  refresh_caches
fi

APK_ERR=0
if [ "$DO_WEB" -eq 1 ]; then
  deploy_web
fi

if [ "$DO_APK" -eq 1 ]; then
  build_apk || APK_ERR=$?
fi

# 网站部署已重启 API；仅 apk-only 时需确保 API 起来
if [ "$DO_WEB" -eq 0 ] && [ "$DO_APK" -eq 1 ]; then
  ensure_api_up
fi

post_smoke

echo ""
echo "=============================================="
echo " 完成"
echo " Home:  $PUBLIC_URL/"
echo " Admin: $PUBLIC_URL/admin/login"
if [ "$DO_APK" -eq 1 ] && [ "$APK_ERR" -eq 0 ]; then
  echo " APK:   backend/uploads/apks/default.apk"
fi
if [ "$APK_ERR" -ne 0 ]; then
  echo " APK:   构建失败，见 /tmp/flutter-apk-build.log"
fi
echo " 修 502: bash scripts/deploy-all.sh --restart-api"
echo " 能力验收: bash scripts/server-capability-test.sh $PUBLIC_URL"
echo "=============================================="
exit "$APK_ERR"
