#!/usr/bin/env bash
# 构建「上海话语音助手」测试 APK — 打开即进语音页，跳过登录
#
# 用法（服务器 ~/blockhub）:
#   bash scripts/build-shanghai-voice-apk.sh
#   PUBLIC_URL=http://你的域名 bash scripts/build-shanghai-voice-apk.sh
#
# 环境变量:
#   APK_BUMP_BUILD=1   在已构建版本基础上 +1（默认，不改 pubspec.yaml）
#   APK_BUMP_BUILD=0   使用 pubspec / 已记录 build 号中较大者
#
# 产物:
#   backend/uploads/apks/shanghai-voice.apk              — 最新包（下载入口）
#   backend/uploads/apks/shanghai-voice-{ver}+{code}.apk — 归档
#   backend/uploads/apks/shanghai-voice.version.json     — 版本元数据
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/apk-version.sh
source "$ROOT/scripts/lib/apk-version.sh"

PUBLIC_URL="${PUBLIC_URL:-http://124.222.177.43}"
API_BASE="${API_BASE_URL:-${PUBLIC_URL%/}/api/v1}"
BRANDING="$ROOT/runtime-app/branding/shanghai-voice.json"

echo "=============================================="
echo " 上海话语音 APK 构建"
echo " API: $API_BASE"
echo " 模式: VOICE_DEMO=1（跳过登录，直达语音页）"
echo "=============================================="

if [ "${APK_BUMP_BUILD:-1}" = "1" ]; then
  echo "==> 解析 APK 版本（build +1，不修改 pubspec.yaml）"
  mapfile -t _ver_parts < <(apk_resolve_build "$ROOT" 1)
else
  mapfile -t _ver_parts < <(apk_resolve_build "$ROOT" 0)
fi
VERSION_NAME="${_ver_parts[0]}"
VERSION_CODE="${_ver_parts[1]}"
export FLUTTER_BUILD_NAME="$VERSION_NAME"
export FLUTTER_BUILD_NUMBER="$VERSION_CODE"
echo "    version: ${VERSION_NAME}+${VERSION_CODE}"

apk_cleanup_shanghai_artifacts "$ROOT"

# 写入当前公网 API（避免写死 IP）
python3 <<PY
import json
from pathlib import Path
p = Path("$BRANDING")
data = json.loads(p.read_text(encoding="utf-8"))
data["api_base_url"] = "$API_BASE"
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("    branding:", p)
PY

export BRANDING_JSON="$BRANDING"
export APP_NAME="上海话语音助手"
export APP_ID="com.blockhub.shanghai.voice"
export TENANT_SLUG="demo"
export API_BASE_URL="$API_BASE"
export VOICE_DEMO=1
export PRIMARY_COLOR="#E11D48"
export SKIP_DEFAULT_APK=1

# 4G 小内存机：仅 arm64、加大 Gradle 堆；默认不停 API（见 gradle-mem-env.sh）
export GRADLE_ULTRA_MEM="${GRADLE_ULTRA_MEM:-1}"

echo "==> flutter clean (ensure dart-define rebaked)"
(cd "$ROOT/runtime-app" && flutter clean)

bash "$ROOT/scripts/flutter-build-apk.sh"

APK_DIR="$ROOT/backend/uploads/apks"
mkdir -p "$APK_DIR"
OUT="$ROOT/runtime-app/build/app/outputs/flutter-apk/app-release.apk"
ARCHIVE="$APK_DIR/shanghai-voice-${VERSION_NAME}+${VERSION_CODE}.apk"
cp "$OUT" "$APK_DIR/shanghai-voice.apk"
cp "$OUT" "$ARCHIVE"
apk_write_shanghai_manifest "$ROOT" "$APK_DIR/shanghai-voice.apk" "$VERSION_NAME" "$VERSION_CODE" >/dev/null

echo ""
echo "==> 上海话测试 APK 已就绪"
echo "    latest : $APK_DIR/shanghai-voice.apk"
echo "    archive: $ARCHIVE"
ls -lh "$APK_DIR/shanghai-voice.apk" "$ARCHIVE"
cat "$APK_DIR/shanghai-voice.version.txt" | sed 's/^/    version.txt: /'
if [ -f "$APK_DIR/default.apk" ]; then
  echo "    default.apk 仍为通用包: $(ls -lh "$APK_DIR/default.apk" | awk '{print $5, $6, $7, $8}')"
fi
echo ""
echo "==> 构建参数确认"
echo "    APP_NAME=${APP_NAME}"
echo "    APP_ID=${APP_ID}"
echo "    API_BASE_URL=${API_BASE_URL}"
echo "    VOICE_DEMO=${VOICE_DEMO}"
echo "    VERSION=${VERSION_NAME}+${VERSION_CODE}"
echo ""
echo "==> 语音 API 快速检查"
VOICE_CFG="$(curl -sf --max-time 8 "http://127.0.0.1:8001/api/v1/voice/config" 2>/dev/null || true)"
if [ -z "$VOICE_CFG" ]; then
  VOICE_CFG="$(curl -sf --max-time 8 "$API_BASE/voice/config" 2>/dev/null || true)"
fi
if echo "$VOICE_CFG" | grep -q '"configured"[[:space:]]*:[[:space:]]*true'; then
  echo "    OK  voice/config configured"
else
  echo "    WARN voice/config 未就绪 — 检查 backend/.env TELEAI_* 并重启 blockhub-api"
  if [ -n "$VOICE_CFG" ]; then
    echo "         response: $VOICE_CFG"
  else
    echo "         (curl 无响应；你手动 curl 若正常可忽略此 WARN)"
  fi
fi
echo ""
echo "==> APK 风味校验"
if bash "$ROOT/scripts/verify-apk-flavor.sh" "$APK_DIR/shanghai-voice.apk" shanghai; then
  echo "    OK  shanghai-voice.apk 确认为上海话专用包"
else
  echo "    FAIL shanghai-voice.apk 校验未通过 — 请勿安装"
  exit 1
fi

echo ""
echo "==> 语音 API 冒烟（优先公网，本机不可达时自动回环 127.0.0.1:8001）"
if bash "$ROOT/scripts/smoke-voice-apk.sh" "${PUBLIC_URL}"; then
  echo "    OK  语音 API 就绪，App 可正常连接"
else
  echo "    WARN 语音 API 冒烟未全通过 — 若本机 curl 127.0.0.1:8001/voice/config 正常，可忽略并继续装 APK"
fi
echo ""
echo "下载:"
echo "  最新 APK : ${PUBLIC_URL%/}/downloads/shanghai-voice.apk"
echo "  版本信息 : ${PUBLIC_URL%/}/downloads/shanghai-voice.version.json"
echo "  scp      : scp root@服务器:$APK_DIR/shanghai-voice.apk ."
echo ""
echo "装好后: 打开 App → 允许麦克风 → 点例句或按住说话"
echo "App 内版本: 设置页标题栏可见 v${VERSION_NAME}+${VERSION_CODE}"
