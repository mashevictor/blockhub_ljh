#!/usr/bin/env bash
# 按 .env 中 IM_*_WEBHOOK_URL 立即 upsert connector（无需打开 Runtime）
# 用法: bash scripts/ensure-im-from-env.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
# shellcheck disable=SC1091
source .venv/bin/activate
python3 <<'PY'
from app.db.session import SessionLocal
from app.services.im_env_bootstrap import ensure_env_im_connectors, env_im_channel_specs

specs = env_im_channel_specs()
print("env channels:", [(v, u[:48] + "…") for v, u, _ in specs] or "(none — set IM_WECOM_WEBHOOK_URL)")
db = SessionLocal()
try:
    n = ensure_env_im_connectors(db)
    print(f"upserted/changed: {n}")
finally:
    db.close()
PY
