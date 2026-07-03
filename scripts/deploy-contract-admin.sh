#!/usr/bin/env bash
# 合同 Agent 发布后：仅重启 API + 构建 Admin（迁移已完成时用）
# 在仓库根目录执行: bash scripts/deploy-contract-admin.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> backend deps + restart API"
cd "$ROOT/backend"
if [ ! -d .venv ]; then python3 -m venv .venv; fi
source .venv/bin/activate
pip install -r requirements.txt -q
alembic upgrade head
sudo systemctl restart blockhub-api
sleep 3
curl -sf http://127.0.0.1:8001/api/v1/health >/dev/null && echo "    API OK" || {
  echo "API 未响应，查看: journalctl -u blockhub-api -n 40 --no-pager"
  exit 1
}

echo "==> build admin (合同盖章页)"
cd "$ROOT/frontend"
npm install --silent
npm run build

echo "==> deploy admin static"
STAGE="$(mktemp -d /tmp/blockhub-admin.XXXXXX)"
cp -r "$ROOT/frontend/dist/." "$STAGE/"
sudo mkdir -p /var/www/blockhub
sudo rm -rf /var/www/blockhub/admin.old
sudo mv /var/www/blockhub/admin /var/www/blockhub/admin.old 2>/dev/null || true
sudo mv "$STAGE" /var/www/blockhub/admin
sudo chown -R www-data:www-data /var/www/blockhub/admin
sudo nginx -t && sudo systemctl reload nginx

echo "==> seed catalog (含 contract_esign Agent)"
bash "$ROOT/scripts/smoke-test.sh" http://127.0.0.1:8001 --seed-only || true

echo ""
echo "完成! Admin: http://101.32.209.251/admin/contracts"
echo "冒烟: bash scripts/smoke-test.sh http://127.0.0.1:8001"
