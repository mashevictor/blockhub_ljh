#!/usr/bin/env bash
# 上海话语音 APK 上线前冒烟 — 验证 APK 依赖的 API / WS / ASR 握手
#
# 用法:
#   bash scripts/smoke-voice-apk.sh
#   bash scripts/smoke-voice-apk.sh http://101.32.209.251
#
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
if [[ "$BASE" == http://* ]] && [[ "$BASE" != *:8001* ]] && [[ "$BASE" != *:8000* ]]; then
  API="$BASE/api/v1"
else
  API="${BASE%/}/api/v1"
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0

ok() { echo "  OK  $1"; PASS=$((PASS + 1)); }
bad() { echo "  FAIL $1"; FAIL=$((FAIL + 1)); }

echo "==> smoke-voice-apk @ $API"

CFG="$(curl -sf --max-time 8 "$API/voice/config" 2>/dev/null || true)"
if echo "$CFG" | grep -q '"configured":true'; then
  ok "voice/config configured"
else
  bad "voice/config not configured — 检查 backend/.env TELEAI_*"
fi

if echo "$CFG" | grep -q 'shanghai-agent'; then
  ok "voice/config ws path"
else
  bad "voice/config missing shanghai-agent ws"
fi

PROBE="$(curl -sf --max-time 20 "$API/voice/auth-probe" 2>/dev/null || true)"
if echo "$PROBE" | grep -q '"ok":true'; then
  ok "voice/auth-probe ASR handshake"
else
  bad "voice/auth-probe failed — ASR 可能不可用"
  echo "       $PROBE"
fi

APK_DEFAULT="$ROOT/backend/uploads/apks/default.apk"
APK_SH="$ROOT/backend/uploads/apks/shanghai-voice.apk"
if [ -f "$APK_SH" ] && [ -s "$APK_SH" ]; then
  ok "shanghai-voice.apk ($(wc -c < "$APK_SH") bytes)"
elif [ -f "$APK_DEFAULT" ] && [ -s "$APK_DEFAULT" ]; then
  ok "default.apk ($(wc -c < "$APK_DEFAULT") bytes)"
else
  bad "no APK on server — run: bash scripts/build-shanghai-voice-apk.sh"
fi

if [ -f "$ROOT/backend/.venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$ROOT/backend/.venv/bin/activate"
  cd "$ROOT/backend"
  if PYTHONPATH=. python scripts/test_teleai_roundtrip.py >/tmp/voice-roundtrip.log 2>&1; then
    ok "TTS→ASR roundtrip (test_teleai_roundtrip.py)"
  else
    bad "TTS→ASR roundtrip failed — see /tmp/voice-roundtrip.log"
    tail -5 /tmp/voice-roundtrip.log 2>/dev/null || true
  fi
  cd "$ROOT"
else
  echo "  SKIP TTS roundtrip (no backend venv)"
fi

echo ""
echo "==> $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  echo "修复后再打 APK: bash scripts/build-shanghai-voice-apk.sh"
  exit 1
fi
echo "APK 测试步骤: 安装 shanghai-voice.apk → 允许麦克风 → 开始说话"
exit 0
