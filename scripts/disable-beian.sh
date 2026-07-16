#!/usr/bin/env bash
# 从备案页切回正式站（只恢复 Nginx，不重建、不删 /beian）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NGINX_AVAIL="/etc/nginx/sites-available/blockhub"
NGINX_ENA="/etc/nginx/sites-enabled/blockhub"
BACKUP="/etc/nginx/sites-available/blockhub.prod.bak"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "请用 sudo 执行: sudo bash scripts/disable-beian.sh"
  exit 1
fi

if [[ ! -f "$BACKUP" ]]; then
  echo "ERROR: 找不到正式站 Nginx 备份 $BACKUP"
  echo "可改用: bash $ROOT/scripts/deploy-one.sh 重新写出正式站配置"
  exit 1
fi

echo "==> 恢复正式站 Nginx ← $BACKUP"
cp -a "$BACKUP" "$NGINX_AVAIL"
ln -sfn "$NGINX_AVAIL" "$NGINX_ENA"
nginx -t
systemctl reload nginx
echo "已切回正式站。/beian 备案页仍保留作备份，可随时再 enable-beian。"
