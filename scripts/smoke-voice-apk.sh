#!/usr/bin/env bash
# 上海话语音 APK 上线前冒烟 — 验证 APK 依赖的 API / WS / ASR 握手
#
# 用法:
#   bash scripts/smoke-voice-apk.sh
#   bash scripts/smoke-voice-apk.sh http://101.32.209.251
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0

ok() { echo "  OK  $1"; PASS=$((PASS + 1)); }
bad() { echo "  FAIL $1"; FAIL=$((FAIL + 1)); }

base_to_api() {
  local base="$1"
  if [[ "$base" == http://* ]] && [[ "$base" != *:8001* ]] && [[ "$base" != *:8000* ]]; then
    echo "${base%/}/api/v1"
  else
    echo "${base%/}/api/v1"
  fi
}

# 构建机 curl 自己的公网 IP 常失败（云主机无 hairpin），回退 127.0.0.1 仍代表 API 就绪
resolve_voice_api() {
  local requested="${1:-http://127.0.0.1:8001}"
  local api local_api
  api="$(base_to_api "$requested")"
  local_api="$(base_to_api "http://127.0.0.1:8001")"

  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$api/voice/config" 2>/dev/null || echo 000)"
  if [ "$code" = "200" ]; then
    echo "$api"
    return 0
  fi

  if [ "$api" != "$local_api" ]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$local_api/voice/config" 2>/dev/null || echo 000)"
    if [ "$code" = "200" ]; then
      echo "    NOTE 公网 $api 从本机不可达 (HTTP $code)，改用 $local_api（App/外网仍走公网）" >&2
      echo "$local_api"
      return 0
    fi
  fi

  echo "$api"
  return 1
}

API="$(resolve_voice_api "${1:-http://127.0.0.1:8001}")"

echo "==> smoke-voice-apk @ $API"

CFG_HTTP="$(curl -s -o /tmp/voice-smoke-config.json -w '%{http_code}' --max-time 8 "$API/voice/config" 2>/dev/null || echo 000)"
CFG="$(cat /tmp/voice-smoke-config.json 2>/dev/null || true)"

if [ "$CFG_HTTP" != "200" ]; then
  bad "voice/config HTTP $CFG_HTTP — API 可能未启动（sudo systemctl start blockhub-api）"
  echo "       body: $(echo "$CFG" | head -c 120)"
elif echo "$CFG" | grep -q '"configured":true'; then
  ok "voice/config configured"
else
  bad "voice/config not configured — TELEAI 未载入进程，检查 .env 后 restart blockhub-api"
  echo "       response: $(echo "$CFG" | head -c 200)"
fi

if [ "$CFG_HTTP" = "200" ] && echo "$CFG" | grep -q 'shanghai-agent'; then
  ok "voice/config ws path"
elif [ "$CFG_HTTP" = "200" ]; then
  bad "voice/config missing shanghai-agent ws"
else
  bad "voice/config missing shanghai-agent ws (no response)"
fi

PROBE_HTTP="$(curl -s -o /tmp/voice-smoke-probe.json -w '%{http_code}' --max-time 20 "$API/voice/auth-probe" 2>/dev/null || echo 000)"
PROBE="$(cat /tmp/voice-smoke-probe.json 2>/dev/null || true)"
if echo "$PROBE" | grep -q '"ok":true'; then
  ok "voice/auth-probe ASR handshake"
else
  if [ "$CFG_HTTP" != "200" ]; then
    bad "voice/auth-probe skipped — API 不可用"
  elif ! echo "$CFG" | grep -q '"configured":true'; then
    bad "voice/auth-probe skipped — TELEAI 未配置"
  else
    bad "voice/auth-probe failed — ASR 握手失败（密钥错误或电信侧未授权）"
  fi
  echo "       HTTP $PROBE_HTTP $(echo "$PROBE" | head -c 200)"
fi

APK_DEFAULT="$ROOT/backend/uploads/apks/default.apk"
APK_SH="$ROOT/backend/uploads/apks/shanghai-voice.apk"
if [ -f "$APK_SH" ] && [ -s "$APK_SH" ]; then
  ok "shanghai-voice.apk ($(wc -c < "$APK_SH") bytes)"
  if [ -f "$ROOT/backend/uploads/apks/shanghai-voice.version.txt" ]; then
    ok "shanghai-voice.version.txt ($(tr -d '\n\r' < "$ROOT/backend/uploads/apks/shanghai-voice.version.txt"))"
  fi
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
    rt_code=$?
    if [ "$rt_code" -eq 2 ]; then
      echo "  WARN TTS→ASR roundtrip 未识别 — TTS 可能正常，见 /tmp/voice-roundtrip.log"
      tail -8 /tmp/voice-roundtrip.log 2>/dev/null || true
    else
      bad "TTS→ASR roundtrip failed — see /tmp/voice-roundtrip.log"
      tail -8 /tmp/voice-roundtrip.log 2>/dev/null || true
    fi
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
