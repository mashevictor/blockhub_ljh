#!/usr/bin/env bash
# 实时查看 APK 构建状态（E2E 卡住时在另一个终端跑）
#
# 用法:
#   bash scripts/watch-apk-build.sh <public_id>
#   bash scripts/watch-apk-build.sh              # 列出最近构建
#   bash scripts/watch-apk-build.sh <id> --follow
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATUS_DIR="$ROOT/backend/uploads/apks/.build-status"
APK_DIR="$ROOT/backend/uploads/apks"
ID="${1:-}"
FOLLOW="${2:-}"

if [ -z "$ID" ]; then
  echo "Recent APK build statuses:"
  ls -lt "$STATUS_DIR"/*.json 2>/dev/null | head -8 || echo "(none)"
  echo ""
  echo "Usage: bash scripts/watch-apk-build.sh <public_id> [--follow]"
  exit 0
fi

json="$STATUS_DIR/${ID}.json"
log="$STATUS_DIR/${ID}.log"
apk="$APK_DIR/${ID}.apk"

show() {
  echo "--- $(date '+%H:%M:%S') ---"
  if [ -f "$json" ]; then
    cat "$json"
  else
    echo "(no status json)"
  fi
  echo ""
  if [ -f "$apk" ]; then
    ls -lh "$apk"
  else
    echo "APK: not ready"
  fi
  echo ""
  if [ -f "$log" ]; then
    echo "log tail:"
    tail -15 "$log"
  else
    echo "log: (none yet)"
  fi
  echo ""
  pgrep -af 'flutter|gradle|flutter-build-from-publish' 2>/dev/null | head -5 || echo "(no flutter/gradle process)"
}

if [ "$FOLLOW" = "--follow" ]; then
  while true; do
    clear 2>/dev/null || true
    show
    [ -f "$apk" ] && exit 0
    if [ -f "$json" ] && grep -q '"status": "failed"' "$json" 2>/dev/null; then
      exit 1
    fi
    sleep 10
  done
else
  show
fi
