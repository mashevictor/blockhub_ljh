#!/usr/bin/env bash
# 自选能力模块打包 APK（无需先 publish）
#
# 用法:
#   bash scripts/flutter-build-custom.sh --list
#   bash scripts/flutter-build-custom.sh chat_qa,approval_flow
#   bash scripts/flutter-build-custom.sh shanghai_voice \
#     --name "上海话助手" --color "#7C3AED" --public-id voice01
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/shared/capability-manifest.json"

usage() {
  cat <<'EOF'
用法: bash scripts/flutter-build-custom.sh <capability_keys> [选项]

  capability_keys   逗号分隔，如 chat_qa,approval_flow,data_nl_query
  --list            列出常用 capability_key
  --name NAME       应用名称（桌面显示）
  --color HEX       主题色，如 #4338CA
  --public-id ID    per-app APK 文件名（8 位 public_id）
  --api URL         API 地址（含 /api/v1）
  --icon URL        图标 PNG 地址

发布时也会自动按 capability_keys 构建；本脚本用于本地/运维手动打包。

样式说明:
  · 主题色/名称/图标 → 按 --name --color --icon（整 App 统一）
  · 能力模块 → 决定底部 Tab 有哪些、各 Tab 页面内容
  · 仅 shanghai_voice 时会进入全屏语音壳（布局不同）
EOF
}

list_keys() {
  python3 <<PY
import json
from pathlib import Path

def caps(raw):
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        return raw.get("capabilities") or raw.get("items") or []
    return []

data = json.loads(Path("$MANIFEST").read_text(encoding="utf-8"))
items = caps(data)
by_cat: dict[str, list] = {}
for c in items:
    by_cat.setdefault(c.get("category", "?"), []).append(c)
for cat in sorted(by_cat):
    print(f"\n[{cat}]")
    for c in sorted(by_cat[cat], key=lambda x: x["key"]):
        print(f"  {c['key']:24} {c['name']}")
PY
}

CAP_KEYS=""
APP_NAME="积木仓应用"
PRIMARY_COLOR="#4338CA"
APP_PUBLIC_ID=""
API_BASE_URL="${API_BASE_URL:-http://124.222.177.43/api/v1}"
ICON_URL=""

if [ $# -eq 0 ]; then
  usage
  exit 1
fi

if [ "$1" = "--list" ]; then
  list_keys
  exit 0
fi

if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  usage
  exit 0
fi

CAP_KEYS="$1"
shift

while [ $# -gt 0 ]; do
  case "$1" in
    --name) APP_NAME="$2"; shift 2 ;;
    --color) PRIMARY_COLOR="$2"; shift 2 ;;
    --public-id) APP_PUBLIC_ID="$2"; shift 2 ;;
    --api) API_BASE_URL="$2"; shift 2 ;;
    --icon) ICON_URL="$2"; shift 2 ;;
    *) echo "未知参数: $1"; usage; exit 1 ;;
  esac
done

if [ -z "$CAP_KEYS" ]; then
  echo "ERROR: 请指定 capability_keys"
  exit 1
fi

# 校验 key 是否在 manifest 中
python3 <<PY
import json, sys
from pathlib import Path

def caps(raw):
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        return raw.get("capabilities") or raw.get("items") or []
    return []

keys = [k.strip() for k in "$CAP_KEYS".split(",") if k.strip()]
raw = json.loads(Path("$MANIFEST").read_text(encoding="utf-8"))
manifest = {c["key"] for c in caps(raw)}
bad = [k for k in keys if k not in manifest]
if bad:
    print("ERROR: 未知 capability_key:", ", ".join(bad), file=sys.stderr)
    print("提示: bash blockhub.sh flutter-build --list", file=sys.stderr)
    sys.exit(1)
print("OK:", len(keys), "keys")
PY

export APP_NAME PRIMARY_COLOR API_BASE_URL CAPABILITY_KEYS="$CAP_KEYS"
export BUILD_PER_APP_ONLY=1
export SKIP_DEFAULT_APK=1
[ -n "$ICON_URL" ] && export ICON_URL
[ -n "$APP_PUBLIC_ID" ] && export APP_PUBLIC_ID

# voice profile 自动检测
if echo "$CAP_KEYS" | grep -qE 'shanghai_voice|shanghai_voice_stream'; then
  export VOICE_DEMO=1
  export APP_ID="${APP_ID:-com.blockhub.shanghai.voice}"
else
  export VOICE_DEMO=0
  export APP_ID="${APP_ID:-com.blockhub.runtime}"
fi

echo "=============================================="
echo " Custom modular APK"
echo " caps:  $CAP_KEYS"
echo " name:  $APP_NAME"
echo " color: $PRIMARY_COLOR"
echo " voice: VOICE_DEMO=${VOICE_DEMO:-0}"
[ -n "$APP_PUBLIC_ID" ] && echo " id:    $APP_PUBLIC_ID"
echo "=============================================="

bash "$ROOT/scripts/flutter-build-apk.sh"

if [ -n "$APP_PUBLIC_ID" ]; then
  APK="$ROOT/backend/uploads/apks/${APP_PUBLIC_ID}.apk"
  [ -f "$APK" ] && echo "==> Ready: $APK ($(wc -c < "$APK") bytes)"
fi
