#!/usr/bin/env bash
# BlockHub 服务器：Docker + PostgreSQL + Redis 一键准备与验证
#
# 适用：在服务器 ~/blockhub（或 /root/blockhub）执行
#
# 用法:
#   bash scripts/server-docker-redis.sh              # 检查/启动 PG+Redis + 验证
#   bash scripts/server-docker-redis.sh --install    # 尝试安装 Docker（Ubuntu/Debian）
#   bash scripts/server-docker-redis.sh --status     # 仅查看状态，不启动
#   bash scripts/server-docker-redis.sh --verify     # 仅验证（容器须已运行）
#
# 生产推荐架构（与 deploy.sh 一致）:
#   Docker  → PostgreSQL (5432) + Redis (6379)
#   systemd → blockhub-api (8001)
#   Nginx   → 静态站点 + /api 反代
#
# 全量部署顺序见文末「推荐命令链」
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:-setup}"
PUBLIC_URL="${PUBLIC_URL:-http://101.32.209.251}"

pass=0
fail=0
warn=0
ok()  { echo "  ✓ $1"; pass=$((pass + 1)); }
no()  { echo "  ✗ $1"; fail=$((fail + 1)); }
tip() { echo "  · $1"; warn=$((warn + 1)); }

redis_ping() {
  local url="${1:-redis://127.0.0.1:6379/0}"
  if command -v redis-cli >/dev/null 2>&1; then
    redis-cli -u "$url" ping 2>/dev/null | grep -q PONG && return 0
  fi
  python3 -c "
import redis
r = redis.from_url('$url', socket_connect_timeout=2)
print(r.ping())
" 2>/dev/null | grep -q True
}

print_header() {
  echo "=============================================="
  echo " BlockHub Docker / Redis / PostgreSQL"
  echo " 目录: $ROOT"
  echo " 模式: $MODE"
  echo "=============================================="
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    ok "Docker 已安装: $(docker --version 2>/dev/null | head -1)"
    return 0
  fi
  echo ""
  echo ">>> 安装 Docker（Ubuntu/Debian）..."
  if ! command -v apt-get >/dev/null 2>&1; then
    no "未检测到 apt-get，请手动安装 Docker: https://docs.docker.com/engine/install/"
    return 1
  fi
  sudo apt-get update -qq
  sudo apt-get install -y ca-certificates curl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc 2>/dev/null \
    || sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  CODENAME=$(. /etc/os-release && echo "${VERSION_CODENAME:-$VERSION_ID}")
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null 2>&1 \
    || true
  sudo apt-get update -qq
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo systemctl enable docker
  sudo systemctl start docker
  ok "Docker 安装完成"
}

check_env() {
  echo ""
  echo "=== backend/.env 检查 ==="
  if [ ! -f "$ROOT/backend/.env" ]; then
    no "backend/.env 不存在"
    echo "    修复: cp backend/.env.example backend/.env && nano backend/.env"
    return 1
  fi
  ok "backend/.env 存在"

  DB_URL=$(grep -E '^DATABASE_URL=' "$ROOT/backend/.env" | cut -d= -f2- || echo "")
  REDIS_URL=$(grep -E '^REDIS_URL=' "$ROOT/backend/.env" | cut -d= -f2- || echo "redis://127.0.0.1:6379/0")

  if [ -z "$DB_URL" ]; then
    no "DATABASE_URL 未设置"
  elif echo "$DB_URL" | grep -q '127.0.0.1:5432\|localhost:5432'; then
    ok "DATABASE_URL 指向本机 Docker PG"
  else
    tip "DATABASE_URL 指向外部数据库（腾讯云等）— 可跳过本机 postgres 容器"
  fi

  if echo "$REDIS_URL" | grep -q '127.0.0.1:6379\|localhost:6379'; then
    ok "REDIS_URL 指向本机 Redis"
  else
    tip "REDIS_URL 指向外部 Redis: ${REDIS_URL%%@*}@***"
  fi

  if grep -q '^JWT_SECRET=change-me' "$ROOT/backend/.env" 2>/dev/null; then
    tip "JWT_SECRET 仍为默认值，生产环境请修改"
  fi
}

show_status() {
  echo ""
  echo "=== Docker 容器 ==="
  if command -v docker >/dev/null 2>&1; then
    docker compose ps 2>/dev/null || docker ps --filter name=trackchat --filter name=blockhub 2>/dev/null || true
    echo ""
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null \
      | grep -E 'trackchat|blockhub|NAMES' || tip "无 blockhub 相关容器"
  else
    no "Docker 未安装"
  fi

  echo ""
  echo "=== 端口监听 ==="
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp | grep -E ':5432|:6379|:8001' || tip "5432/6379/8001 无监听"
  fi

  echo ""
  echo "=== Redis PING ==="
  REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379/0}"
  if [ -f "$ROOT/backend/.env" ]; then
    REDIS_URL=$(grep -E '^REDIS_URL=' "$ROOT/backend/.env" | cut -d= -f2- || echo "$REDIS_URL")
  fi
  if redis_ping "$REDIS_URL"; then ok "Redis PONG"; else no "Redis 不可用"; fi

  echo ""
  echo "=== API Health ==="
  HEALTH=$(curl -sf --max-time 5 http://127.0.0.1:8001/api/v1/health 2>/dev/null || echo "")
  if echo "$HEALTH" | grep -q '"status"'; then
    ok "API /health 可达"
    if echo "$HEALTH" | grep -q '"redis":"ok"'; then
      ok "API 报告 redis=ok"
    elif echo "$HEALTH" | grep -q '"redis":"unavailable"'; then
      no "API 报告 redis=unavailable — 启动 Redis 后需: sudo systemctl restart blockhub-api"
    fi
  else
    tip "API 未响应 :8001 — 若尚未部署可忽略"
  fi
}

start_infra() {
  echo ""
  echo "=== 启动基础设施 ==="
  if ! command -v docker >/dev/null 2>&1; then
    no "Docker 不可用"
    return 1
  fi

  echo ">>> pgvector 检查"
  bash "$ROOT/scripts/setup-pgvector.sh" && ok "PostgreSQL + pgvector" || no "pgvector 失败"

  echo ""
  echo ">>> Redis 检查/启动"
  bash "$ROOT/scripts/setup-redis.sh" && ok "Redis 就绪" || no "Redis 失败"

  echo ""
  echo ">>> docker compose up -d postgres redis"
  docker compose up -d postgres redis
  sleep 3

  if docker compose ps postgres 2>/dev/null | grep -q 'Up\|running'; then
    ok "postgres 容器运行中"
  else
    no "postgres 容器未运行"
  fi
  if docker compose ps redis 2>/dev/null | grep -q 'Up\|running'; then
    ok "redis 容器运行中"
  else
    no "redis 容器未运行"
  fi
}

verify_all() {
  echo ""
  echo "=== 基础设施验证 ==="
  show_status

  echo ""
  echo "=== 数据库 schema ==="
  if [ -f "$ROOT/backend/.venv/bin/activate" ]; then
    bash "$ROOT/scripts/smoke-db.sh" "http://127.0.0.1:8001" && ok "smoke-db 通过" || no "smoke-db 失败"
  else
    tip "backend/.venv 不存在 — 先运行 bash scripts/deploy.sh 或 server-db.sh"
  fi

  echo ""
  echo "=== Redis 在 API 中生效 ==="
  HEALTH=$(curl -sf --max-time 5 http://127.0.0.1:8001/api/v1/health 2>/dev/null || echo "")
  if echo "$HEALTH" | grep -q '"redis":"ok"'; then
    ok "health.redis=ok（限流/缓存已启用）"
  else
    no "health.redis!=ok — 执行: sudo systemctl restart blockhub-api"
    echo "    当前: ${HEALTH:-API 无响应}"
  fi
}

print_next_steps() {
  echo ""
  echo "=============================================="
  echo " 推荐命令链（在服务器依次执行）"
  echo "=============================================="
  cat <<EOF

# ── 首次部署 ──
cd ~/blockhub                          # 或 /root/blockhub
git pull origin main
cp backend/.env.example backend/.env   # 首次：编辑 JWT_SECRET / DATABASE_URL / REDIS_URL
bash scripts/server-docker-redis.sh --install
bash scripts/server-docker-redis.sh
bash scripts/server-db.sh              # 迁移 + 校验表
bash scripts/deploy-all.sh --web-only  # 构建前端 + 重启 API + Nginx

# ── 日常更新 ──
bash scripts/server-all.sh             # 部署 + 本机/公网冒烟

# ── 验证（由轻到重）──
bash scripts/server-docker-redis.sh --verify
bash scripts/smoke-db.sh http://127.0.0.1:8001
bash scripts/smoke-test.sh http://127.0.0.1:8001
bash scripts/smoke-test.sh $PUBLIC_URL
bash scripts/regression-114.sh $PUBLIC_URL
bash scripts/smoke-custom-capability.sh $PUBLIC_URL
bash scripts/load-10vu.sh $PUBLIC_URL 10
bash scripts/smoke-ga.sh $PUBLIC_URL   # GA 全量（含 E2E）

# ── 故障排查 ──
bash scripts/diagnose-api.sh
docker compose ps
docker compose logs redis --tail 30
docker compose logs postgres --tail 30
journalctl -u blockhub-api -n 50 --no-pager

EOF
  echo "=============================================="
  echo " 结果: $pass 通过, $fail 失败, $warn 提示"
  echo "=============================================="
  [ "$fail" -eq 0 ]
}

print_header
check_env || true

case "$MODE" in
  --install)
    install_docker
    start_infra
    verify_all
    print_next_steps
    ;;
  --status)
    show_status
    print_next_steps
    ;;
  --verify)
    verify_all
    print_next_steps
    ;;
  setup|*)
    if ! command -v docker >/dev/null 2>&1; then
      tip "Docker 未安装 — 运行: bash scripts/server-docker-redis.sh --install"
    fi
    start_infra
    verify_all
    print_next_steps
    ;;
esac
