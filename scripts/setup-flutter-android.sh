#!/usr/bin/env bash
# One-time server setup for Flutter Android APK builds (Tencent Cloud / Ubuntu).
# Usage: sudo bash scripts/setup-flutter-android.sh
set -euo pipefail

echo "==> Installing Java 17 (required by Android Gradle Plugin 8.7+)..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y openjdk-17-jdk unzip curl git
elif command -v yum >/dev/null 2>&1; then
  yum install -y java-17-openjdk-devel unzip curl git
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

if ! command -v flutter >/dev/null 2>&1; then
  echo "==> Flutter not found. Install Flutter 3.x stable and add to PATH, then re-run."
  echo "    https://docs.flutter.dev/get-started/install/linux"
  exit 1
fi

export FLUTTER_ROOT_ALLOW_ROOT=true
flutter doctor -v || true

echo "==> Accepting Android SDK licenses..."
yes | flutter doctor --android-licenses >/dev/null 2>&1 || yes | sdkmanager --licenses >/dev/null 2>&1 || true

echo "==> Installing cmdline-tools / platform if missing..."
flutter precache --android

echo "Done. Build with: APP_NAME=laoliu bash scripts/flutter-build-apk.sh"
