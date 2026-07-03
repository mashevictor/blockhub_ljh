#!/usr/bin/env bash
# Build release APK with tenant branding (name / icon / API).
# Usage:
#   bash scripts/flutter-build-apk.sh
#   APP_NAME="我的应用" TENANT_SLUG=demo API_BASE_URL=http://101.32.209.251/api/v1 bash scripts/flutter-build-apk.sh
#   BRANDING_JSON=runtime-app/branding/branding.json bash scripts/flutter-build-apk.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/runtime-app"
cd "$APP_DIR"

if ! command -v flutter >/dev/null 2>&1; then
  echo "ERROR: flutter CLI not found. Install Flutter 3.x and retry."
  exit 1
fi

# Root builds: Flutter warns but CI/servers often run as root — allow explicitly.
if [ "$(id -u 2>/dev/null || echo 0)" -eq 0 ]; then
  export FLUTTER_ROOT_ALLOW_ROOT=true
  echo "NOTE: building as root (FLUTTER_ROOT_ALLOW_ROOT=true). Prefer a normal user when possible."
fi

# Bootstrap android res / gradle wrapper when repo skeleton is incomplete.
needs_bootstrap=0
if [ ! -f android/app/src/main/res/values/styles.xml ]; then needs_bootstrap=1; fi
if [ ! -f android/gradlew ]; then needs_bootstrap=1; fi
if [ "$needs_bootstrap" -eq 1 ]; then
  echo "==> Bootstrapping Android platform files (flutter create)..."
  flutter create . --platforms=android --org com.trackchat.runtime
  # flutter create may add *.kts duplicates — keep our Groovy build scripts with appLabel support.
  rm -f android/build.gradle.kts android/settings.gradle.kts android/app/build.gradle.kts
  rm -rf android/app/src/main/kotlin/com/trackchat/runtime/trackchat_runtime_app 2>/dev/null || true
fi

BRANDING_FILE="${BRANDING_JSON:-$APP_DIR/branding/branding.json}"
if [ -f "$BRANDING_FILE" ]; then
  APP_NAME="${APP_NAME:-$(python3 -c "import json; print(json.load(open('$BRANDING_FILE'))['app_name'])")}"
  APP_ID="${APP_ID:-$(python3 -c "import json; print(json.load(open('$BRANDING_FILE'))['app_id'])")}"
  TENANT_SLUG="${TENANT_SLUG:-$(python3 -c "import json; print(json.load(open('$BRANDING_FILE'))['tenant_slug'])")}"
  API_BASE_URL="${API_BASE_URL:-$(python3 -c "import json; print(json.load(open('$BRANDING_FILE'))['api_base_url'])")}"
  PRIMARY_COLOR="${PRIMARY_COLOR:-$(python3 -c "import json; print(json.load(open('$BRANDING_FILE'))['primary_color'])")}"
  ICON_URL="${ICON_URL:-$(python3 -c "import json; print(json.load(open('$BRANDING_FILE')).get('icon_url',''))")}"
fi

APP_NAME="${APP_NAME:-TrackChat}"
APP_ID="${APP_ID:-com.trackchat.runtime}"
TENANT_SLUG="${TENANT_SLUG:-demo}"
API_BASE_URL="${API_BASE_URL:-http://101.32.209.251/api/v1}"
PRIMARY_COLOR="${PRIMARY_COLOR:-#4338CA}"

mkdir -p branding
if [ ! -f branding/icon.png ]; then
  if [ -n "${ICON_URL:-}" ]; then
    curl -fsSL "$ICON_URL" -o branding/icon.png
  else
    python3 - <<'PY'
from PIL import Image, ImageDraw, ImageFont
img = Image.new("RGB", (512, 512), "#4338CA")
draw = ImageDraw.Draw(img)
draw.ellipse((96, 96, 416, 416), fill="#ffffff")
draw.text((210, 220), "T", fill="#4338CA")
img.save("branding/icon.png")
PY
  fi
fi

flutter pub get
dart run flutter_launcher_icons

echo "==> Building APK: $APP_NAME ($APP_ID)"
set +e
flutter build apk --release \
  -PappLabel="$APP_NAME" \
  --dart-define=APP_NAME="$APP_NAME" \
  --dart-define=APP_ID="$APP_ID" \
  --dart-define=TENANT_SLUG="$TENANT_SLUG" \
  --dart-define=API_BASE_URL="$API_BASE_URL" \
  --dart-define=PRIMARY_COLOR="$PRIMARY_COLOR" 2>&1 | tee /tmp/flutter-apk-build.log
build_status=${PIPESTATUS[0]}
set -e
if [ "$build_status" -ne 0 ]; then
  echo "ERROR: flutter build apk failed (exit $build_status). Last Gradle lines:"
  tail -n 40 /tmp/flutter-apk-build.log 2>/dev/null || true
  if [ -f android/build/reports/problems/problems-report.html ]; then
    echo "See android/build/reports/problems/problems-report.html"
  fi
  exit "$build_status"
fi

OUT="$APP_DIR/build/app/outputs/flutter-apk/app-release.apk"
APK_DIR="$ROOT/backend/uploads/apks"
mkdir -p "$APK_DIR"
cp "$OUT" "$APK_DIR/default.apk"
if [ -n "${APP_PUBLIC_ID:-}" ]; then
  cp "$OUT" "$APK_DIR/${APP_PUBLIC_ID}.apk"
  echo "Per-app APK: $APK_DIR/${APP_PUBLIC_ID}.apk"
fi
echo "APK: $OUT"
echo "Default APK for download API: $APK_DIR/default.apk"
ls -lh "$OUT" "$APK_DIR/default.apk"
