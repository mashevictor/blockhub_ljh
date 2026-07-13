#!/usr/bin/env bash
# 腾讯云 PostgreSQL 迁移（Alembic head + 冒烟）
# 用法:
#   export DATABASE_URL='postgresql+psycopg2://user:pass@xxx.tencentcdb.com:5432/trackchat'
#   bash scripts/migrate-tencentdb.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    # shellcheck disable=SC1091
    set -a
    source .env
    set +a
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: 请设置 DATABASE_URL（腾讯云 PostgreSQL 连接串）"
  echo ""
  echo "  从腾讯云控制台 → PostgreSQL → 实例详情 → 复制「内网/外网地址」"
  echo "  格式: postgresql+psycopg2://用户名:密码@真实主机:5432/数据库名?sslmode=require"
  echo ""
  echo "  示例（勿直接复制占位符）:"
  echo "  export DATABASE_URL='postgresql+psycopg2://trackchat:真实密码@pg-abc12345.tencentcdb.com:5432/trackchat?sslmode=require'"
  echo "  bash scripts/migrate-tencentdb.sh"
  exit 1
fi

# 拒绝文档占位符
if echo "$DATABASE_URL" | grep -qE 'xxx\.|pg-xxxxx|YOUR_PASSWORD|user:pass@|your-domain|example\.com'; then
  echo "ERROR: DATABASE_URL 仍是文档占位符，请换成腾讯云控制台里的真实连接信息"
  echo "  当前 host 片段含: xxx / pg-xxxxx / user:pass 等占位符"
  echo "  参考: backend/env.tencent.example"
  exit 1
fi

echo "==> Target DB: ${DATABASE_URL%%@*}@***"

echo "==> Preflight: DNS + TCP"
python3 <<'PY'
import os, re, socket, sys
from urllib.parse import urlparse, unquote

url = os.environ.get("DATABASE_URL", "")
# sqlalchemy URL → urlparse 需要去掉 +psycopg2
norm = re.sub(r"postgresql\+\w+://", "postgresql://", url)
p = urlparse(norm)
host = p.hostname
port = p.port or 5432
if not host:
    sys.exit("ERROR: 无法解析 DATABASE_URL 中的 host")
try:
    infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    ip = infos[0][4][0]
    print(f"    DNS OK: {host} -> {ip}:{port}")
except socket.gaierror as e:
    print(f"ERROR: 无法解析主机名 '{host}' — 请确认腾讯云地址是否正确、服务器能否访问外网/内网", file=sys.stderr)
    print(f"       {e}", file=sys.stderr)
    print("  提示: 占位符 xxx.tencentcdb.com 不是真实地址", file=sys.stderr)
    sys.exit(1)
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(8)
try:
    sock.connect((host, port))
    print(f"    TCP OK: {host}:{port} 可达")
except OSError as e:
    print(f"ERROR: DNS 已解析但 TCP 连接失败 {host}:{port}", file=sys.stderr)
    print(f"       {e}", file=sys.stderr)
    print("  提示: 检查安全组是否放行 5432、是否需用内网地址、白名单是否含本机 IP", file=sys.stderr)
    sys.exit(1)
finally:
    sock.close()
PY

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

echo "==> Alembic upgrade head"
alembic upgrade head
alembic current

echo "==> Verify tables"
python3 <<'PY'
from sqlalchemy import inspect
from app.db.session import engine

required = [
    "users", "custom_capabilities",
    "catalog_office_scenarios", "catalog_industry_scenarios",
    "catalog_hero_presets", "catalog_chip_templates",
    "notifications", "demo_bookings", "plaza_feed_likes",
    "knowledge_bases", "kb_documents", "approvals",
]
insp = inspect(engine)
missing = [t for t in required if not insp.has_table(t)]
if missing:
    raise SystemExit(f"ERROR: missing tables: {missing}")
print("    all required tables present")
PY

echo "==> Seed (optional, idempotent)"
cd "$ROOT"
if [ -f scripts/smoke-test.sh ]; then
  bash scripts/smoke-test.sh "${SMOKE_BASE:-http://127.0.0.1:8001}" --seed-only || true
fi

if [ -n "${SMOKE_BASE:-}" ] && [ -f scripts/smoke-db.sh ]; then
  echo "==> Post-migrate smoke-db @ $SMOKE_BASE"
  bash scripts/smoke-db.sh "$SMOKE_BASE" || true
fi

echo "==> Done. Update backend/.env DATABASE_URL and restart API."
echo "    Backup: bash scripts/pg-backup.sh"
echo "    Secrets: bash scripts/rotate-secrets-check.sh backend/.env"
