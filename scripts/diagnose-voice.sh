#!/usr/bin/env bash
# 诊断上海话语音 API / TELEAI 配置
# 用法: bash scripts/diagnose-voice.sh [http://124.222.177.43]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="${1:-http://124.222.177.43}"
ENV_FILE="$ROOT/backend/.env"

echo "=========================================="
echo " BlockHub Voice / TELEAI Diagnostics"
echo " Repo: $ROOT"
echo " Public: $PUBLIC"
echo "=========================================="

echo ""
echo "=== 1. blockhub-api 服务 ==="
if command -v systemctl >/dev/null 2>&1; then
  systemctl is-active blockhub-api 2>/dev/null || echo "inactive"
  grep -E 'WorkingDirectory|EnvironmentFile|ExecStart' /etc/systemd/system/blockhub-api.service 2>/dev/null || echo "(no systemd unit)"
else
  echo "systemctl not available"
fi

echo ""
echo "=== 2. backend/.env 中的 TELEAI（脱敏）==="
if [ -f "$ENV_FILE" ]; then
  grep -E '^TELEAI_' "$ENV_FILE" | sed -E 's/(TELEAI_APP_KEY=).*/\1***/' || echo "(无 TELEAI_* 行)"
  if grep -qE '^TELEAI_APP_ID=[[:space:]]*$' "$ENV_FILE" 2>/dev/null; then
    echo "WARN: TELEAI_APP_ID 为空"
  fi
  if grep -qE '^TELEAI_APP_KEY=[[:space:]]*$' "$ENV_FILE" 2>/dev/null; then
    echo "WARN: TELEAI_APP_KEY 为空"
  fi
  if grep -E '^TELEAI_' "$ENV_FILE" | grep -qE '[[:space:]]$|。$|"$|'\''$'; then
    echo "WARN: TELEAI 行可能有尾部空格、中文句号或多余引号，请检查"
  fi
else
  echo "MISSING: $ENV_FILE"
fi

echo ""
echo "=== 3. Python 进程实际读到的配置 ==="
if [ -f "$ROOT/backend/.venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$ROOT/backend/.venv/bin/activate"
  cd "$ROOT/backend"
  PYTHONPATH=. python3 <<'PY'
from app.core.config import settings
from app.services.teleai_auth import teleai_configured

def mask(s: str) -> str:
    s = (s or "").strip()
    if not s:
        return "(empty)"
    if len(s) <= 8:
        return s[:2] + "***"
    return s[:4] + "..." + s[-4:]

print(f"  teleai_app_id:  {mask(settings.teleai_app_id)}")
print(f"  teleai_app_key: {mask(settings.teleai_app_key)}")
print(f"  teleai_configured(): {teleai_configured()}")
print(f"  teleai_host: {settings.teleai_host}")
print(f"  teleai_asr_path: {settings.teleai_asr_path}")
PY
  cd "$ROOT"
else
  echo "SKIP: no backend/.venv"
fi

echo ""
echo "=== 4. 本机 API (127.0.0.1:8001) ==="
LOCAL_CODE="$(curl -s -o /tmp/voice-local.json -w '%{http_code}' --max-time 5 http://127.0.0.1:8001/api/v1/health 2>/dev/null || echo 000)"
echo "  health HTTP: $LOCAL_CODE"
if [ "$LOCAL_CODE" = "200" ]; then
  curl -sf --max-time 5 http://127.0.0.1:8001/api/v1/voice/config | head -c 400
  echo ""
  curl -sf --max-time 20 http://127.0.0.1:8001/api/v1/voice/auth-probe | head -c 400
  echo ""
else
  echo "  FAIL — API 未监听 8001，先: sudo systemctl start blockhub-api"
fi

echo ""
echo "=== 5. 公网 Nginx 代理 ==="
PUB_CODE="$(curl -s -o /tmp/voice-pub.json -w '%{http_code}' --max-time 8 "${PUBLIC%/}/api/v1/voice/config" 2>/dev/null || echo 000)"
echo "  voice/config HTTP: $PUB_CODE"
if [ "$PUB_CODE" = "200" ] && [ -f /tmp/voice-pub.json ]; then
  head -c 400 /tmp/voice-pub.json
  echo ""
else
  echo "  body: $(head -c 200 /tmp/voice-pub.json 2>/dev/null || echo '(empty)')"
fi

echo ""
echo "=== 6. 修复建议 ==="
echo "  1) 确认 .env 两行无空格/引号/句号:"
echo "     TELEAI_APP_ID=你的id"
echo "     TELEAI_APP_KEY=你的key"
echo "  2) 改 .env 后必须重启（reload 不够）:"
echo "     sudo systemctl restart blockhub-api"
echo "  3) 若刚打完 APK 出现 502，先启动 API:"
echo "     sudo systemctl start blockhub-api"
echo "  4) 验收:"
echo "     bash scripts/smoke-voice-apk.sh $PUBLIC"
echo "=========================================="
