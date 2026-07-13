#!/usr/bin/env bash
# D31 · 12 模板 × 12 行业 UI 自动化检查
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$ROOT/backend/.venv/bin/python"
[ -x "$PY" ] || PY=python3

"$PY" "$ROOT/scripts/check-template-industry-ui.py" \
  "${OUT:-$ROOT/docs/previews/template-industry-ui-check.html}"
