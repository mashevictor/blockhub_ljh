#!/usr/bin/env bash
# 仅刷新 Nginx 配置（不重建前端）。用于 certbot 后修复 HTTP 301→POST 被改成 GET 的问题。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SSL_CERT="/etc/nginx/ssl/blockhub-selfsigned.crt"
SSL_KEY="/etc/nginx/ssl/blockhub-selfsigned.key"
for d in blockhub.club www.blockhub.club; do
  if [ -f "/etc/letsencrypt/live/$d/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$d/privkey.pem" ]; then
    SSL_CERT="/etc/letsencrypt/live/$d/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/$d/privkey.pem"
    echo "SSL: Let's Encrypt ($d)"
    break
  fi
done

sed -e "s|BLOCKHUB_ROOT|$ROOT|g" \
    -e "s|SSL_CERTIFICATE_PATH|$SSL_CERT|g" \
    -e "s|SSL_CERTIFICATE_KEY_PATH|$SSL_KEY|g" \
    "$ROOT/scripts/nginx-blockhub.conf" | sudo tee /etc/nginx/sites-available/blockhub >/dev/null
sudo ln -sf /etc/nginx/sites-available/blockhub /etc/nginx/sites-enabled/blockhub
sudo nginx -t
sudo systemctl reload nginx
echo "OK: nginx reloaded (HTTP→HTTPS=308, /api/ on :80 proxied)"
