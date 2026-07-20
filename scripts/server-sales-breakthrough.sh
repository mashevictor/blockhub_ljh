#!/usr/bin/env bash
# 销售突破能力 · 服务器一键：库表迁移(039) → 重启 API → 冒烟
#
# 在服务器 ~/blockhub（或仓库根）执行：
#   cd ~/blockhub && git pull
#   bash scripts/server-sales-breakthrough.sh
#
# 仅迁移不重启 / 仅冒烟：
#   bash scripts/server-sales-breakthrough.sh --no-restart
#   bash scripts/server-sales-breakthrough.sh --smoke-only
#   bash scripts/server-sales-breakthrough.sh http://127.0.0.1:8001
#
# 环境变量:
#   ADMIN_EMAIL / ADMIN_PASSWORD  默认 admin@trackchat.local / admin123
#   PUBLIC_URL                    冒烟目标，默认 http://127.0.0.1:8001
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NO_RESTART=false
SMOKE_ONLY=false
BASE="${PUBLIC_URL:-http://127.0.0.1:8001}"

for arg in "$@"; do
  case "$arg" in
    --no-restart) NO_RESTART=true ;;
    --smoke-only) SMOKE_ONLY=true ;;
    -h|--help)
      sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    http://*|https://*) BASE="$arg" ;;
  esac
done

if [ ! -f "$ROOT/backend/.env" ]; then
  echo "ERROR: backend/.env 不存在"
  echo "  cp backend/.env.example backend/.env && 配置 DATABASE_URL"
  exit 1
fi

if [ -x "$ROOT/backend/.venv/bin/python" ]; then
  # shellcheck disable=SC1091
  source "$ROOT/backend/.venv/bin/activate"
  PY="$ROOT/backend/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PY="$(command -v python3)"
else
  echo "ERROR: 需要 backend/.venv 或系统 python3"
  exit 1
fi

echo "=============================================="
echo " 销售突破 · deal_evidence + kill_pipeline"
echo " 目录: $ROOT"
echo " PY:   $PY"
echo " API:  $BASE"
echo "=============================================="

if [ "$SMOKE_ONLY" = false ]; then
  echo ""
  echo ">>> [1/4] alembic upgrade head（含 039 成交证据/杀单表）"
  cd "$ROOT/backend"
  alembic upgrade head
  alembic current
  cd "$ROOT"

  echo ""
  echo ">>> [2/4] 校验突破能力表"
  cd "$ROOT/backend"
  "$PY" <<'PY'
from sqlalchemy import inspect, text
from app.db.session import engine

insp = inspect(engine)
need = ("deal_evidence_records", "kill_pipeline_records", "sales_lead_records")
missing = [t for t in need if not insp.has_table(t)]
for t in need:
    print(f"  {'✓' if t not in missing else '✗'} {t}")
if missing:
    raise SystemExit(f"FAIL: 缺表 {', '.join(missing)} — 检查 alembic/versions/039_*.py 是否已 pull")

# 关键列抽查（避免空表名对上但结构残缺）
de_cols = {c["name"] for c in insp.get_columns("deal_evidence_records")}
kp_cols = {c["name"] for c in insp.get_columns("kill_pipeline_records")}
for col in ("evidence_type", "target_stage", "lead_id", "customer"):
    if col not in de_cols:
        raise SystemExit(f"FAIL: deal_evidence_records 缺列 {col}")
for col in ("kill_reason", "learning", "lead_id", "customer"):
    if col not in kp_cols:
        raise SystemExit(f"FAIL: kill_pipeline_records 缺列 {col}")

with engine.connect() as conn:
    row = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
    print(f"  alembic_version: {row[0] if row else 'empty'}")
print("schema OK")
PY
  cd "$ROOT"

  if [ "$NO_RESTART" = false ]; then
    echo ""
    echo ">>> [3/4] 重启 blockhub-api（加载新路由）"
    if command -v systemctl >/dev/null 2>&1; then
      sudo systemctl restart blockhub-api
      # 冷启动 / seed 可能超过 2s
      ok_health=0
      for i in 1 2 3 4 5 6 7 8 9 10; do
        sleep 1
        if curl -sf --max-time 5 http://127.0.0.1:8001/api/v1/health >/dev/null 2>&1; then
          ok_health=1
          echo "  ✓ API health OK (wait ${i}s)"
          break
        fi
      done
      if [ "$ok_health" -ne 1 ]; then
        echo "  ✗ API health 失败 — 最近 journal："
        journalctl -u blockhub-api -n 50 --no-pager || true
        echo ""
        echo "  手动诊断:"
        echo "    sudo systemctl status blockhub-api --no-pager"
        echo "    cd ~/blockhub/backend && source .venv/bin/activate && python3 -c 'from app.main import app; print(app.title)'"
        echo "    curl -sv http://127.0.0.1:8001/api/v1/health"
        exit 1
      fi
    else
      echo "  WARN: 无 systemctl，请自行重启 API 进程后再冒烟"
    fi
  else
    echo ""
    echo ">>> [3/4] 跳过 API 重启 (--no-restart)"
  fi
else
  echo ""
  echo ">>> 跳过迁移 (--smoke-only)"
fi

echo ""
echo ">>> [4/4] 冒烟测试"
bash "$ROOT/scripts/smoke-sales-breakthrough.sh" "$BASE"

echo ""
echo "=============================================="
echo " 完成。可选再跑:"
echo "   bash scripts/smoke-db.sh $BASE"
echo "   bash scripts/fix-catalog.sh   # catalog/agent 缺 seed 时"
echo "=============================================="
