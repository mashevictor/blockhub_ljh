#!/usr/bin/env bash
# P1-0 · Web/Flutter parity matrix report
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$ROOT/backend/.venv/bin/python"
[ -x "$PY" ] || PY=python3
exec "$PY" "$ROOT/scripts/flutter-parity-report.py" "$@"
