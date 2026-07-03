#!/usr/bin/env bash
# Build release APK with tenant branding (name / icon / API).
# Usage:
#   bash scripts/flutter-build-apk.sh
#   APP_NAME="我的应用" TENANT_SLUG=demo API_BASE_URL=http://101.32.209.251/api/v1 bash scripts/flutter-build-apk.sh
#   BRANDING_JSON=runtime-app/branding/branding.json bash scripts/flutter-build-apk.sh
#
# Server first-time setup (Java 17 + SDK licenses):
#   sudo bash scripts/setup-flutter-android.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/runtime-app"
BUILD_LOG="${BUILD_LOG:-/tmp/flutter-apk-build.log}"
# shellcheck source=lib/android-sdk-env.sh
source "$ROOT/scripts/lib/android-sdk-env.sh"
cd "$APP_DIR"

if ! command -v flutter >/dev/null 2>&1; then
  for d in /opt/flutter /root/flutter /usr/local/flutter; do
    if [ -x "$d/bin/flutter" ]; then
      export PATH="$d/bin:$PATH"
      break
    fi
  done
fi

if ! command -v flutter >/dev/null 2>&1; then
  echo "ERROR: flutter CLI not found. Run: sudo bash scripts/setup-flutter-android.sh"
  exit 1
fi

# Root builds: Flutter warns but CI/servers often run as root — allow explicitly.
if [ "$(id -u 2>/dev/null || echo 0)" -eq 0 ]; then
  export FLUTTER_ROOT_ALLOW_ROOT=true
  echo "NOTE: building as root (FLUTTER_ROOT_ALLOW_ROOT=true). Prefer a normal user when possible."
fi

ensure_java_17() {
  java_major() {
    java -version 2>&1 | head -n1 | sed -E 's/.*version "([0-9]+).*/\1/'
  }
  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
  :
  else
    for d in /usr/lib/jvm/java-17-openjdk-* /usr/lib/jvm/temurin-17-* /usr/lib/jvm/java-21-openjdk-*; do
      if [ -d "$d" ] && [ -x "$d/bin/java" ]; then
        export JAVA_HOME="$d"
        break
      fi
    done
  fi
  if [ -n "${JAVA_HOME:-}" ]; then
    export PATH="$JAVA_HOME/bin:$PATH"
  fi
  local major
  major="$(java_major || echo 0)"
  if [ "$major" -lt 17 ] 2>/dev/null; then
    echo "ERROR: Java 17+ required (AGP 8.7). Current: $(java -version 2>&1 | head -n1)"
    echo "  Fix: sudo bash scripts/setup-flutter-android.sh"
    echo "  Or:  sudo apt install -y openjdk-17-jdk && export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
    exit 1
  fi
  echo "==> Java: $(java -version 2>&1 | head -n1) (JAVA_HOME=${JAVA_HOME:-system})"
}

dump_gradle_failure() {
  local gradle_log="${GRADLE_LOG:-/tmp/gradle-assemble-release.log}"
  echo ""
  echo "========== Gradle failure diagnostics =========="
  if [ -f "$BUILD_LOG" ]; then
    echo "--- flutter log (errors only) ---"
    grep -E "FAILURE:|error:|Error:|Exception|What went wrong|Execution failed|BUILD FAILED" "$BUILD_LOG" | tail -n 40 || true
    echo "--- flutter log (last 40 lines) ---"
    tail -n 40 "$BUILD_LOG" || true
  fi
  if [ -f android/build/reports/problems/problems-report.html ]; then
    echo "See: $APP_DIR/android/build/reports/problems/problems-report.html"
  fi
  if [ -x android/gradlew ]; then
    echo "--- gradlew :app:assembleRelease --stacktrace (full log: $gradle_log) ---"
    (cd android && ./gradlew :app:assembleRelease --stacktrace --no-daemon 2>&1 | tee "$gradle_log") || true
    echo "--- gradle errors (grep) ---"
    grep -E "FAILURE:|error:|Error:|Exception|What went wrong|Execution failed|BUILD FAILED" "$gradle_log" | tail -n 40 || true
    echo "--- gradle log (last 80 lines) ---"
    tail -n 80 "$gradle_log" || true
  fi
  echo "==============================================="
}

# Bootstrap android res / gradle wrapper when repo skeleton is incomplete.
needs_bootstrap=0
if [ ! -f android/app/src/main/res/values/styles.xml ]; then needs_bootstrap=1; fi
if [ ! -f android/gradlew ]; then needs_bootstrap=1; fi
if [ "$needs_bootstrap" -eq 1 ]; then
  echo "==> Bootstrapping Android platform files (flutter create)..."
  flutter create . --platforms=android --org com.trackchat.runtime
  rm -f android/build.gradle.kts android/settings.gradle.kts android/app/build.gradle.kts
  rm -rf android/app/src/main/kotlin/com/trackchat/runtime/trackchat_runtime_app 2>/dev/null || true
fi

ensure_java_17

configure_android_sdk "$APP_DIR" || exit 1
accept_android_licenses

echo "==> Flutter: $(flutter --version | head -n1)"

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
from PIL import Image, ImageDraw
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
  --dart-define=PRIMARY_COLOR="$PRIMARY_COLOR" 2>&1 | tee "$BUILD_LOG"
build_status=${PIPESTATUS[0]}
set -e
if [ "$build_status" -ne 0 ]; then
  echo "ERROR: flutter build apk failed (exit $build_status)."
  dump_gradle_failure
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
