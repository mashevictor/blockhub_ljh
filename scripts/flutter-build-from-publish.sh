#!/usr/bin/env bash
# Build a per-app APK from publish queue spec (backend/uploads/apks/.build-queue/{id}.json).
#
# Usage:
#   bash scripts/flutter-build-from-publish.sh <public_id>
#
set -euo pipefail

PUBLIC_ID="${1:?usage: flutter-build-from-publish.sh <public_id>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC="$ROOT/backend/uploads/apks/.build-queue/${PUBLIC_ID}.json"

if [ ! -f "$SPEC" ]; then
  echo "ERROR: build spec not found: $SPEC"
  exit 1
fi

eval "$(python3 <<PY
import json
from pathlib import Path
spec = json.loads(Path("$SPEC").read_text(encoding="utf-8"))
fields = {
    "APP_PUBLIC_ID": spec["public_id"],
    "APP_NAME": spec.get("app_name", "积木仓应用"),
    "APP_ID": spec.get("android_app_id", "com.blockhub.runtime"),
    "TENANT_SLUG": spec.get("tenant_slug", "demo"),
    "API_BASE_URL": spec.get("api_base_url", "http://101.32.209.251/api/v1"),
    "PRIMARY_COLOR": spec.get("primary_color", "#4338CA"),
    "VOICE_DEMO": "1" if spec.get("voice_demo") else "0",
    "ICON_URL": spec.get("icon_url") or "",
}
for key, val in fields.items():
    safe = str(val).replace("'", "'\\''")
    print(f"export {key}='{safe}'")
print(f"export BUILD_PROFILE='{spec.get('profile_id', 'generic')}'")
PY
)"

export SKIP_DEFAULT_APK=1
export BUILD_PER_APP_ONLY=1

echo "=============================================="
echo " Per-app APK build"
echo " public_id: $APP_PUBLIC_ID"
echo " profile:   ${BUILD_PROFILE:-generic}"
echo " name:      $APP_NAME"
echo " voice:     VOICE_DEMO=$VOICE_DEMO"
echo "=============================================="

bash "$ROOT/scripts/flutter-build-apk.sh"

APK="$ROOT/backend/uploads/apks/${PUBLIC_ID}.apk"
if [ ! -s "$APK" ]; then
  echo "ERROR: expected APK missing: $APK"
  exit 1
fi

echo "==> Per-app APK ready: $APK ($(wc -c < "$APK") bytes)"
