#!/usr/bin/env bash
# Thin wrapper — prefer pure Python for Windows: python scripts/check_i18n_drift.py
# 用法: bash scripts/check-i18n-drift.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -x "$ROOT/backend/.venv/bin/python" ]; then
  PY="$ROOT/backend/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PY="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PY="$(command -v python)"
else
  echo "ERROR: need python3 or backend/.venv"
  exit 1
fi

exec "$PY" "$ROOT/scripts/check_i18n_drift.py"
