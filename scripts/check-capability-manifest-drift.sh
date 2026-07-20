#!/usr/bin/env bash
# 防止 capability_registry 与 shared/capability-manifest 双份漂移
# 用法: bash scripts/check-capability-manifest-drift.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -x "$ROOT/backend/.venv/bin/python" ]; then
  PY="$ROOT/backend/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PY="$(command -v python3)"
else
  echo "ERROR: need python3 or backend/.venv"
  exit 1
fi

echo "==> regenerate capability-manifest from registry"
(cd "$ROOT" && "$PY" scripts/codegen-capability-manifest.py)

if command -v git >/dev/null 2>&1 && [ -d "$ROOT/.git" ]; then
  if ! git -C "$ROOT" diff --quiet -- shared/capability-manifest.ts shared/capability-manifest.json; then
    echo "ERROR: shared/capability-manifest.{ts,json} 与 capability_registry 不一致"
    echo "  请运行: python3 scripts/codegen-capability-manifest.py 并提交生成物"
    git -C "$ROOT" diff --stat -- shared/capability-manifest.ts shared/capability-manifest.json
    exit 1
  fi
else
  echo "WARN: no git — skip diff check after regenerate"
fi

echo "OK capability-manifest in sync with registry"
