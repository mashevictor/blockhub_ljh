#!/usr/bin/env bash
# P1-3 · Build APK from capability_keys (no publish queue)
#
# Usage:
#   bash scripts/flutter-build-from-manifest.sh \
#     --keys chat_qa,approval_flow \
#     --app-name "Parity Test" \
#     --public-id parity-test-001
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYS=""
APP_NAME="${APP_NAME:-BlockHub Test}"
PUBLIC_ID="${APP_PUBLIC_ID:-}"
API_BASE="${API_BASE_URL:-http://124.222.177.43/api/v1}"

while [ $# -gt 0 ]; do
  case "$1" in
    --keys) KEYS="$2"; shift 2 ;;
    --app-name) APP_NAME="$2"; shift 2 ;;
    --public-id) PUBLIC_ID="$2"; shift 2 ;;
    --api-base) API_BASE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [ -z "$KEYS" ]; then
  echo "ERROR: --keys required"
  exit 1
fi

PY="$ROOT/backend/.venv/bin/python"
[ -x "$PY" ] || PY=python3

echo "==> Sync pubspec from keys: $KEYS"
"$PY" "$ROOT/scripts/flutter-sync-pubspec-from-manifest.py" --keys "$KEYS"

export CAPABILITY_KEYS="$KEYS"
export APP_NAME
export API_BASE_URL="$API_BASE"
export SKIP_DEFAULT_APK=1
export BUILD_PER_APP_ONLY=1
export BUILD_SKIP_STOP_SERVICES=1
[ -n "$PUBLIC_ID" ] && export APP_PUBLIC_ID="$PUBLIC_ID"

bash "$ROOT/scripts/flutter-build-apk.sh"

if [ -n "$PUBLIC_ID" ]; then
  APK="$ROOT/backend/uploads/apks/${PUBLIC_ID}.apk"
  if [ -s "$APK" ]; then
    echo "==> Manifest build APK: $APK ($(wc -c < "$APK") bytes)"
  fi
fi
