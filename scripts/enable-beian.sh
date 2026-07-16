#!/usr/bin/env bash
# 备案关站开关（正式站代码/静态资源一律不动）
#
# 仅替换 Nginx 站点配置：对外域名暂时指向 /beian 静态页。
# 正式站文件仍在 /var/www/blockhub，审核通过后 disable-beian 一键切回。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BEIAN_SRC="$ROOT/beian"
BEIAN_DST="/beian"
NGINX_SRC="$ROOT/scripts/nginx-blockhub-beian.conf"
NGINX_AVAIL="/etc/nginx/sites-available/blockhub"
NGINX_ENA="/etc/nginx/sites-enabled/blockhub"
BACKUP="/etc/nginx/sites-available/blockhub.prod.bak"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "请用 sudo 执行: sudo bash scripts/enable-beian.sh"
  exit 1
fi

echo "==> 安装备案静态页 → $BEIAN_DST（与正式站 /var/www/blockhub 分离）"
mkdir -p "$BEIAN_DST"
cp -a "$BEIAN_SRC/." "$BEIAN_DST/"
chown -R www-data:www-data "$BEIAN_DST" 2>/dev/null || chown -R nginx:nginx "$BEIAN_DST" 2>/dev/null || true

# 只在尚未备份时保存正式 Nginx；已在备案模式则不覆盖备份
if [[ -f "$NGINX_AVAIL" ]]; then
  if grep -q 'root /beian' "$NGINX_AVAIL" 2>/dev/null; then
    echo "==> 当前已是备案配置，保留既有正式站备份 $BACKUP"
  else
    echo "==> 备份正式站 Nginx → $BACKUP（审核通过后用于切回）"
    cp -a "$NGINX_AVAIL" "$BACKUP"
  fi
fi

echo "==> 切换 Nginx → 备案页（正式站文件未删除）"
cp -a "$NGINX_SRC" "$NGINX_AVAIL"
ln -sfn "$NGINX_AVAIL" "$NGINX_ENA"

if [[ ! -f /etc/letsencrypt/live/blockhub.club/fullchain.pem ]]; then
  echo "WARN: 未找到 Let's Encrypt 证书，仅保留 :80"
  awk '
    BEGIN { n=0 }
    /^server \{/ { n++; if (n==2) skip=1 }
    skip && /^\}/ { skip=0; next }
    !skip { print }
  ' "$NGINX_AVAIL" > "${NGINX_AVAIL}.tmp"
  mv "${NGINX_AVAIL}.tmp" "$NGINX_AVAIL"
fi

nginx -t
systemctl reload nginx
echo ""
echo "已切到备案页。正式官网仍在 /var/www/blockhub，未改动。"
echo "  检查: curl -sS http://blockhub.club/ | head"
echo "  切回: sudo bash $ROOT/scripts/disable-beian.sh"
