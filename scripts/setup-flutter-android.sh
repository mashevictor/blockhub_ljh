#!/usr/bin/env bash
# One-time server setup for Flutter Android APK builds (Tencent Cloud / Ubuntu).
# Usage:
#   export ANDROID_HOME=/root/Android   # if SDK not auto-detected
#   sudo bash scripts/setup-flutter-android.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FLUTTER_DIR="${FLUTTER_DIR:-/opt/flutter}"
# shellcheck source=lib/android-sdk-env.sh
source "$ROOT/scripts/lib/android-sdk-env.sh"

echo "==> Installing Java 17 (required by Android Gradle Plugin 8.7+)..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y openjdk-17-jdk unzip curl git xz-utils ca-certificates
elif command -v yum >/dev/null 2>&1; then
  yum install -y java-17-openjdk-devel unzip curl git xz
else
  echo "WARN: install OpenJDK 17 manually if not present"
fi

JAVA17=""
for d in /usr/lib/jvm/java-17-openjdk-* /usr/lib/jvm/temurin-17-*; do
  if [ -d "$d" ]; then JAVA17="$d"; break; fi
done
if [ -n "$JAVA17" ]; then
  export JAVA_HOME="$JAVA17"
  echo "JAVA_HOME=$JAVA_HOME"
  "$JAVA_HOME/bin/java" -version
else
  java -version || true
  echo "ERROR: Java 17 not found after install"
  exit 1
fi

find_flutter() {
  if command -v flutter >/dev/null 2>&1; then
    command -v flutter
    return 0
  fi
  for d in "$FLUTTER_DIR" /root/flutter /usr/local/flutter "${HOME:-/root}/flutter"; do
    if [ -x "$d/bin/flutter" ]; then
      echo "$d/bin/flutter"
      return 0
    fi
  done
  return 1
}

install_flutter_stable() {
  if [ -d "$FLUTTER_DIR/bin" ]; then
    echo "==> Flutter already at $FLUTTER_DIR"
    return 0
  fi
  echo "==> Installing Flutter stable to $FLUTTER_DIR ..."
  mkdir -p "$(dirname "$FLUTTER_DIR")"
  rm -rf "${FLUTTER_DIR}.tmp"
  git clone --depth 1 -b stable https://github.com/flutter/flutter.git "${FLUTTER_DIR}.tmp"
  mv "${FLUTTER_DIR}.tmp" "$FLUTTER_DIR"
}

if ! FLUTTER_BIN="$(find_flutter)"; then
  install_flutter_stable
  FLUTTER_BIN="$FLUTTER_DIR/bin/flutter"
fi

export PATH="$(dirname "$FLUTTER_BIN"):$PATH"
export FLUTTER_ROOT_ALLOW_ROOT=true

echo "==> Flutter: $($FLUTTER_BIN --version | head -n1)"

configure_android_sdk "$ROOT/runtime-app"
accept_android_licenses

echo "==> Precaching Android toolchain..."
flutter precache --android

echo ""
echo "==> flutter doctor (android)"
flutter doctor -v 2>&1 | grep -A6 "Android toolchain" || flutter doctor -v || true

echo ""
echo "Done. Add to ~/.bashrc or run before build:"
echo "  export ANDROID_HOME=\"${ANDROID_HOME}\""
echo "  export ANDROID_SDK_ROOT=\"${ANDROID_HOME}\""
echo "  export PATH=\"$(dirname "$FLUTTER_BIN"):\$ANDROID_HOME/platform-tools:\$PATH\""
echo "  export JAVA_HOME=\"$JAVA_HOME\""
echo "  export FLUTTER_ROOT_ALLOW_ROOT=true"
echo ""
echo "Build: cd $ROOT && APP_NAME=laoliu bash scripts/flutter-build-apk.sh"
