#!/usr/bin/env bash
# 在服务器上运行：bash scripts/diagnose-speed.sh
set -euo pipefail

echo "=== 1. 本机静态文件（应 <200ms）==="
JS=$(ls /var/www/blockhub/home/assets/*.js 2>/dev/null | head -1 || true)
if [ -n "$JS" ]; then
  NAME="/assets/$(basename "$JS")"
  curl -o /dev/null -s -w "home JS %{http_code} time=%{time_total}s size=%{size_download}\n" "http://127.0.0.1${NAME}"
else
  echo "未找到 home assets"
fi

echo ""
echo "=== 2. API（应 <500ms）==="
curl -o /dev/null -s -w "summary %{http_code} time=%{time_total}s\n" http://127.0.0.1:8001/api/v1/catalog/summary
curl -o /dev/null -s -w "office lite %{http_code} time=%{time_total}s\n" "http://127.0.0.1:8001/api/v1/catalog/office?lite=true"

echo ""
echo "=== 3. Nginx gzip 是否生效 ===="
curl -sI -H "Accept-Encoding: gzip" "http://127.0.0.1${NAME:-/assets/}" | grep -i content-encoding || echo "未检测到 gzip（需更新 nginx 配置）"

echo ""
echo "=== 4. 服务器负载 ===="
uptime
free -h | head -2
