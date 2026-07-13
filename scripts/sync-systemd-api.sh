#!/usr/bin/env bash
# 同步 blockhub-api systemd 单元（PATH 含 /bin/bash、flutter）
#
# 用法:
#   bash scripts/sync-systemd-api.sh
#   sudo bash scripts/sync-systemd-api.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UNIT_SRC="$ROOT/scripts/blockhub-api.service"
UNIT_DST="/etc/systemd/system/blockhub-api.service"

if [ ! -f "$UNIT_SRC" ]; then
  echo "ERROR: missing $UNIT_SRC"
  exit 1
fi

echo "==> Sync systemd: $UNIT_DST"
sed "s|BLOCKHUB_ROOT|$ROOT|g" "$UNIT_SRC" | sudo tee "$UNIT_DST" >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable blockhub-api 2>/dev/null || true

if grep -q '/usr/bin:/bin' "$UNIT_DST" 2>/dev/null; then
  echo "  ✓ PATH includes system /usr/bin:/bin"
else
  echo "  WARN: PATH may be too narrow — APK 后台构建会失败"
fi

echo "==> Restart blockhub-api"
sudo systemctl restart blockhub-api
sleep 2
if curl -sf --max-time 5 http://127.0.0.1:8001/api/v1/health >/dev/null; then
  echo "  ✓ API health OK"
else
  echo "  WARN: API not ready — journalctl -u blockhub-api -n 30"
fi
