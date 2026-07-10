#!/usr/bin/env bash
# 构建「上海话语音助手」测试 APK — 打开即进语音页，跳过登录
#
# 用法（服务器 ~/blockhub）:
#   bash scripts/build-shanghai-voice-apk.sh
#   PUBLIC_URL=http://你的域名 bash scripts/build-shanghai-voice-apk.sh
#
# 产物:
#   backend/uploads/apks/shanghai-voice.apk  — 推荐测试包
#   backend/uploads/apks/default.apk         — 下载 API 默认回退包
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
export API_BASE_URL="$API_BASE"
export VOICE_DEMO=1
export PRIMARY_COLOR="#E11D48"

bash "$ROOT/scripts/flutter-build-apk.sh"

APK_DIR="$ROOT/backend/uploads/apks"
mkdir -p "$APK_DIR"
cp "$APK_DIR/default.apk" "$APK_DIR/shanghai-voice.apk"
echo ""
echo "==> 上海话测试 APK 已就绪"
ls -lh "$APK_DIR/shanghai-voice.apk" "$APK_DIR/default.apk"
echo ""
echo "下载测试:"
echo "  直链: ${PUBLIC_URL}/api/v1/runtime/demo/download  (需 default.apk 存在)"
echo "  或拷到手机: scp root@服务器:$APK_DIR/shanghai-voice.apk ."
echo ""
echo "装好后: 打开 App → 允许麦克风 → 点「开始说话」→ 说上海话"
echo "验收:   bash scripts/smoke-voice-apk.sh ${PUBLIC_URL}"
