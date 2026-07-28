#!/usr/bin/env bash
# Build release APK with tenant branding (name / icon / API).
# Usage:
#   bash scripts/flutter-build-apk.sh
#   APP_NAME="我的应用" TENANT_SLUG=demo API_BASE_URL=http://124.222.177.43/api/v1 bash scripts/flutter-build-apk.sh
#   BRANDING_JSON=runtime-app/branding/branding.json bash scripts/flutter-build-apk.sh
#
# Server first-time setup (Java 17 + SDK licenses):
#   sudo bash scripts/setup-flutter-android.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/runtime-app"
BUILD_LOG="${BUILD_LOG:-/tmp/flutter-apk-build.log}"
APK_LOCK_FILE="${BLOCKHUB_APK_LOCK:-/tmp/blockhub-flutter-apk.lock}"
# shellcheck source=lib/android-sdk-env.sh
source "$ROOT/scripts/lib/android-sdk-env.sh"
# shellcheck source=lib/gradle-mem-env.sh
source "$ROOT/scripts/lib/gradle-mem-env.sh"
cd "$APP_DIR"

# 全局互斥：API 后台构建与 smoke-apk 手动构建不可并行（小内存 Gradle OOM）
if command -v flock >/dev/null 2>&1; then
  exec 200>"$APK_LOCK_FILE"
  echo "==> Waiting for APK build lock ($APK_LOCK_FILE)..."
  flock -x 200
  echo "==> APK build lock acquired"
fi

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
    gradle_diagnose_oom "$gradle_log"
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

gradle_preflight_check
apply_gradle_memory_profile "$APP_DIR/android"
if [ -f "$APP_DIR/android/gradle.properties.build" ]; then
  cp "$APP_DIR/android/gradle.properties.build" "$APP_DIR/android/gradle.properties"
fi
gradle_free_memory_for_build "$APP_DIR/android"
trap 'gradle_restore_stopped_services' EXIT

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
# 正式发布经由 flutter-build-from-publish.sh 注入唯一 APP_ID=com.blockhub.app.{public_id}
APP_ID="${APP_ID:-com.blockhub.runtime}"
APP_PUBLIC_ID="${APP_PUBLIC_ID:-}"
TENANT_SLUG="${TENANT_SLUG:-demo}"
API_BASE_URL="${API_BASE_URL:-http://124.222.177.43/api/v1}"
PRIMARY_COLOR="${PRIMARY_COLOR:-#4338CA}"
VOICE_DEMO="${VOICE_DEMO:-0}"
APP_UI_ID="${APP_UI_ID:-bottom_tabs}"
CAPABILITY_KEYS="${CAPABILITY_KEYS:-}"
SKIP_DEFAULT_APK="${SKIP_DEFAULT_APK:-0}"

if [ -z "${APP_ID}" ] || [ "$APP_ID" = "com.trackchat.runtime" ]; then
  APP_ID="com.blockhub.runtime"
fi
# 有 public_id 却未设唯一包名时，按规则推导（防止误打共享包名）
if [ -n "$APP_PUBLIC_ID" ] && { [ "$APP_ID" = "com.blockhub.runtime" ] || [ "$APP_ID" = "com.trackchat.runtime" ]; }; then
  APP_ID="$(python3 -c "
import re,sys
pid=sys.argv[1].strip().lower()
slug=re.sub(r'[^a-z0-9_]','_',pid)
slug=re.sub(r'_+','_',slug).strip('_') or 'app'
if slug[0].isdigit(): slug='a'+slug
print('com.blockhub.app.'+slug)
" "$APP_PUBLIC_ID")"
fi

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

# 确保 melos / deferred codegen 存在（deploy 误删或干净检出后缺文件会直接炸编译）
ensure_runtime_codegen() {
  local reg="$ROOT/runtime-app/lib/melos_capability_registry.g.dart"
  local def="$ROOT/runtime-app/lib/capability_deferred_loader.g.dart"
  if [ -f "$reg" ] && [ -f "$def" ]; then
    return 0
  fi
  echo "==> Missing registry .g.dart — restore / regenerate..."
  if git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
    git -C "$ROOT" checkout HEAD -- \
      runtime-app/lib/melos_capability_registry.g.dart \
      runtime-app/lib/capability_deferred_loader.g.dart \
      2>/dev/null || true
  fi
  if [ -f "$reg" ] && [ -f "$def" ]; then
    echo "    restored from git"
    return 0
  fi
  local py="$ROOT/backend/.venv/bin/python"
  [ -x "$py" ] || py=python3
  if [ -f "$ROOT/scripts/flutter-sync-pubspec-from-manifest.py" ]; then
    local sync_args=()
    if [ -n "${CAPABILITY_KEYS:-}" ]; then
      sync_args+=(--keys "$CAPABILITY_KEYS")
    fi
    "$py" "$ROOT/scripts/flutter-sync-pubspec-from-manifest.py" "${sync_args[@]}"
  fi
  if [ ! -f "$reg" ] || [ ! -f "$def" ]; then
    echo "ERROR: still missing $reg or $def"
    echo "  Fix: bash scripts/flutter-dev-reset.sh"
    exit 1
  fi
}
ensure_runtime_codegen

flutter pub get
dart run tool/generate_modular_config.dart 2>/dev/null || true
dart run flutter_launcher_icons

echo "==> Building APK: $APP_NAME ($APP_ID)"
echo "    API_BASE_URL=$API_BASE_URL"
echo "    VOICE_DEMO=$VOICE_DEMO"
if [ -n "${CAPABILITY_KEYS:-}" ]; then
  echo "    CAPABILITY_KEYS=$CAPABILITY_KEYS"
fi
if [ -n "${FLUTTER_BUILD_NAME:-}" ] && [ -n "${FLUTTER_BUILD_NUMBER:-}" ]; then
  echo "    VERSION=${FLUTTER_BUILD_NAME}+${FLUTTER_BUILD_NUMBER}"
fi
FLUTTER_BUILD_ARGS=(
  --release
  -PappLabel="$APP_NAME"
  -PandroidAppId="$APP_ID"
  --dart-define=APP_NAME="$APP_NAME"
  --dart-define=APP_ID="$APP_ID"
  --dart-define=TENANT_SLUG="$TENANT_SLUG"
  --dart-define=API_BASE_URL="$API_BASE_URL"
  --dart-define=PRIMARY_COLOR="$PRIMARY_COLOR"
  --dart-define=VOICE_DEMO="$VOICE_DEMO"
  --dart-define=APP_UI_ID="$APP_UI_ID"
)
if [ -n "$CAPABILITY_KEYS" ]; then
  FLUTTER_BUILD_ARGS+=(--dart-define=CAPABILITY_KEYS="$CAPABILITY_KEYS")
fi
# split-per-abi 与 --target-platform android-arm64 互斥（Gradle abiFilters 冲突）
USE_SPLIT_ABI=0
USE_ARM64_ONLY=0
case "${GRADLE_MEMORY_PROFILE:-}" in
  ultra|low)
    USE_ARM64_ONLY=1
    ;;
esac
if [ "$USE_ARM64_ONLY" -eq 0 ] && { [ "${BUILD_PER_APP_ONLY:-0}" = "1" ] || [ -n "$CAPABILITY_KEYS" ]; }; then
  USE_SPLIT_ABI=1
fi
if [ "$USE_SPLIT_ABI" -eq 1 ]; then
  FLUTTER_BUILD_ARGS+=(--split-per-abi)
  echo "    Modular build: split-per-abi enabled"
elif [ "$USE_ARM64_ONLY" -eq 1 ]; then
  FLUTTER_BUILD_ARGS+=(--target-platform android-arm64)
  echo "    小内存模式：仅构建 arm64-v8a（无 split-per-abi）"
fi
if [ -n "$APP_PUBLIC_ID" ]; then
  FLUTTER_BUILD_ARGS+=(--dart-define=APP_PUBLIC_ID="$APP_PUBLIC_ID")
fi
if [ -n "${FLUTTER_BUILD_NAME:-}" ]; then
  FLUTTER_BUILD_ARGS+=(--build-name="$FLUTTER_BUILD_NAME")
fi
if [ -n "${FLUTTER_BUILD_NUMBER:-}" ]; then
  FLUTTER_BUILD_ARGS+=(--build-number="$FLUTTER_BUILD_NUMBER")
fi
set +e
flutter build apk "${FLUTTER_BUILD_ARGS[@]}" 2>&1 | tee "$BUILD_LOG"
build_status=${PIPESTATUS[0]}
set -e
if [ "$build_status" -ne 0 ]; then
  echo "ERROR: flutter build apk failed (exit $build_status)."
  gradle_diagnose_oom "$BUILD_LOG"
  dump_gradle_failure
  exit "$build_status"
fi

APK_OUT_DIR="$APP_DIR/build/app/outputs/flutter-apk"
OUT="$APK_OUT_DIR/app-release.apk"
if [ ! -f "$OUT" ]; then
  for candidate in app-arm64-v8a-release.apk app-armeabi-v7a-release.apk; do
    if [ -f "$APK_OUT_DIR/$candidate" ]; then
      OUT="$APK_OUT_DIR/$candidate"
      echo "==> Using split APK: $(basename "$OUT")"
      break
    fi
  done
fi
if [ ! -f "$OUT" ]; then
  echo "ERROR: APK output not found under $APK_OUT_DIR"
  ls -la "$APK_OUT_DIR" 2>/dev/null || true
  exit 1
fi
APK_DIR="$ROOT/backend/uploads/apks"
mkdir -p "$APK_DIR"
if [ "$SKIP_DEFAULT_APK" != "1" ]; then
  cp "$OUT" "$APK_DIR/default.apk"
fi
if [ -n "${APP_PUBLIC_ID:-}" ]; then
  cp "$OUT" "$APK_DIR/${APP_PUBLIC_ID}.apk"
  echo "Per-app APK: $APK_DIR/${APP_PUBLIC_ID}.apk"
fi
echo "APK: $OUT"
if [ "$SKIP_DEFAULT_APK" != "1" ]; then
  echo "Default APK for download API: $APK_DIR/default.apk"
  ls -lh "$OUT" "$APK_DIR/default.apk"
else
  ls -lh "$OUT"
fi
