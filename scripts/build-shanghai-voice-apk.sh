#!/usr/bin/env bash
# 构建「上海话语音助手」测试 APK — 打开即进语音页，跳过登录
#
# 用法（服务器 ~/blockhub）:
#   bash scripts/build-shanghai-voice-apk.sh
#   PUBLIC_URL=http://你的域名 bash scripts/build-shanghai-voice-apk.sh
#
# 产物:
#   backend/uploads/apks/shanghai-voice.apk  — 上海话专用（不覆盖 default.apk）
#   backend/uploads/apks/default.apk         — 通用 TrackChat（仅 flutter-build-apk.sh 默认构建写入）
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_URL="${PUBLIC_URL:-http://101.32.209.251}"
API_BASE="${API_BASE_URL:-${PUBLIC_URL%/}/api/v1}"
BRANDING="$ROOT/runtime-app/branding/shanghai-voice.json"

echo "=============================================="
echo " 上海话语音 APK 构建"
echo " API: $API_BASE"
echo " 模式: VOICE_DEMO=1（跳过登录，直达语音页）"
echo "=============================================="

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

echo "==> flutter clean (ensure dart-define rebaked)"
(cd "$ROOT/runtime-app" && flutter clean)

bash "$ROOT/scripts/flutter-build-apk.sh"

APK_DIR="$ROOT/backend/uploads/apks"
mkdir -p "$APK_DIR"
OUT="$ROOT/runtime-app/build/app/outputs/flutter-apk/app-release.apk"
cp "$OUT" "$APK_DIR/shanghai-voice.apk"
echo ""
echo "==> 上海话测试 APK 已就绪（未覆盖 default.apk）"
ls -lh "$APK_DIR/shanghai-voice.apk"
if [ -f "$APK_DIR/default.apk" ]; then
  echo "    default.apk 仍为通用包: $(ls -lh "$APK_DIR/default.apk" | awk '{print $5, $6, $7, $8}')"
fi
echo ""
echo "==> 构建参数确认"
echo "    APP_NAME=${APP_NAME}"
echo "    APP_ID=${APP_ID}"
echo "    API_BASE_URL=${API_BASE_URL}"
echo "    VOICE_DEMO=${VOICE_DEMO}"
echo ""
echo "==> 语音 API 冒烟"
VOICE_CFG="$(curl -sf --max-time 8 "$API_BASE/voice/config" 2>/dev/null || true)"
if [ -z "$VOICE_CFG" ]; then
  # 构建机 curl 公网 IP 可能不通，回退本机 backend
  VOICE_CFG="$(curl -sf --max-time 8 "http://127.0.0.1:8001/api/v1/voice/config" 2>/dev/null || true)"
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
echo "下载测试:"
echo "  上海话专用: scp root@服务器:$APK_DIR/shanghai-voice.apk ."
echo "  通用 TrackChat 下载 API 仍走 default.apk（与上海话包隔离）"
echo ""
echo "装好后: 打开 App → 允许麦克风 → 点「开始说话」→ 说上海话"
echo "验收:   bash scripts/smoke-voice-apk.sh ${PUBLIC_URL}"
