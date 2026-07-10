# shellcheck shell=bash
# 低配 VPS 上 npm/tsc/vite 构建内存与 API 抢占处理

npm_mem_available_mb() {
  awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 1024
}

npm_mem_total_mb() {
  awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 4096
}

npm_should_stop_api_for_build() {
  case "${DEPLOY_STOP_API_FOR_BUILD:-auto}" in
    1|true|yes) return 0 ;;
    0|false|no) return 1 ;;
  esac
  local avail total
  avail="$(npm_mem_available_mb)"
  total="$(npm_mem_total_mb)"
  # 可用内存 < 2.2G 或 总内存 <= 4G 且可用 < 2.8G 时暂停 API
  if [ "$avail" -lt 2200 ]; then
    return 0
  fi
  if [ "$total" -le 4096 ] && [ "$avail" -lt 2800 ]; then
    return 0
  fi
  return 1
}

npm_prepare_build_env() {
  local avail
  avail="$(npm_mem_available_mb)"
  if [ "$avail" -lt 1200 ]; then
    export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1024}"
  elif [ "$avail" -lt 2200 ]; then
    export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
  else
    export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
  fi
  export CI="${CI:-true}"
  echo "    npm build env: NODE_OPTIONS=${NODE_OPTIONS} MemAvailable=${avail}MB"
}

npm_run_build() {
  local dir="$1"
  local name="${2:-$dir}"
  cd "$dir"
  echo "    [$name] npm install..."
  npm install --silent
  if [ "${DEPLOY_SKIP_TSC:-}" = "1" ]; then
    echo "    [$name] vite build (skip tsc — DEPLOY_SKIP_TSC=1)"
    npx vite build
  else
    echo "    [$name] tsc + vite build (may take 2-5 min on small VPS)..."
    npm run build
  fi
}

npm_restart_api_after_build() {
  echo "    restarting API after frontend build..."
  sudo systemctl start blockhub-api 2>/dev/null || sudo systemctl restart blockhub-api
  local ok=false
  for i in $(seq 1 10); do
    if curl -sf --max-time 3 http://127.0.0.1:8001/api/v1/health >/dev/null 2>&1; then
      ok=true
      echo "    API health OK (attempt $i)"
      break
    fi
    sleep 2
  done
  if [ "$ok" != true ]; then
    echo "ERROR: API not responding after build — journalctl -u blockhub-api -n 30"
    journalctl -u blockhub-api -n 30 --no-pager 2>/dev/null || true
    return 1
  fi
}
