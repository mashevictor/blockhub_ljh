#!/usr/bin/env bash
# 恢复 runtime-app 开发态：完整 pubspec + registry codegen（APK 构建 sync 后必跑）
#
# Usage:
#   bash scripts/flutter-dev-reset.sh
#   bash blockhub.sh flutter-dev-reset
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$ROOT/backend/.venv/bin/python"
[ -x "$PY" ] || PY=python3

echo "==> Restore runtime-app dev artifacts from git..."
if git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  git -C "$ROOT" checkout -- \
    runtime-app/pubspec.yaml \
    runtime-app/pubspec.lock \
    runtime-app/lib/melos_capability_registry.dart \
    runtime-app/lib/melos_capability_registry.g.dart \
    runtime-app/lib/capability_deferred_loader.g.dart 2>/dev/null || true
fi

if [ ! -f "$ROOT/runtime-app/lib/melos_capability_registry.g.dart" ]; then
  echo "==> Generate registry (missing .g.dart)..."
  "$PY" "$ROOT/scripts/flutter-sync-pubspec-from-manifest.py"
fi

if command -v flutter >/dev/null 2>&1; then
  echo "==> flutter pub get..."
  (cd "$ROOT/runtime-app" && flutter pub get)
fi

echo "==> Dev reset OK"
