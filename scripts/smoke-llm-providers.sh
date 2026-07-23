#!/usr/bin/env bash
# 验证 backend/.env 里 LLM_* / CODEGEN_*（智谱 / OpenRouter 等）是否可用
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
PY="${ROOT}/backend/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  PY="$(command -v python3 || command -v python)"
fi
exec "$PY" "$ROOT/scripts/smoke-llm-providers.py"
