#!/usr/bin/env bash
# 验证 APK 包名与内置品牌（防止 shanghai-voice 与 default TrackChat 搞混）
#
# 用法:
#   bash scripts/verify-apk-flavor.sh backend/uploads/apks/shanghai-voice.apk shanghai
#   bash scripts/verify-apk-flavor.sh backend/uploads/apks/default.apk trackchat
#
set -euo pipefail

APK="${1:?usage: verify-apk-flavor.sh <apk> [shanghai|trackchat]}"
FLAVOR="${2:-shanghai}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK_PATH="$APK"
if [[ "$APK_PATH" != /* ]]; then
  APK_PATH="$ROOT/$APK_PATH"
fi

if [ ! -f "$APK_PATH" ]; then
  echo "ERROR: APK not found: $APK_PATH"
  exit 1
fi

AAPT=""
for c in aapt aapt2 "${ANDROID_HOME:-}/build-tools/"*/aapt "${ANDROID_HOME:-}/build-tools/"*/aapt2; do
  if [ -x "$c" ] 2>/dev/null; then
    AAPT="$c"
    break
  fi
done

if [ -z "$AAPT" ]; then
  echo "WARN: aapt not found — skip package check (install Android build-tools)"
  exit 0
fi

PKG="$("$AAPT" dump badging "$APK_PATH" 2>/dev/null | sed -n "s/^package: name='\([^']*\)'.*/\1/p" | head -n1)"
VER_CODE="$("$AAPT" dump badging "$APK_PATH" 2>/dev/null | sed -n "s/^package:.*versionCode='\([^']*\)'.*/\1/p" | head -n1)"
VER_NAME="$("$AAPT" dump badging "$APK_PATH" 2>/dev/null | sed -n "s/^package:.*versionName='\([^']*\)'.*/\1/p" | head -n1)"
LABEL="$("$AAPT" dump badging "$APK_PATH" 2>/dev/null | sed -n "s/^application-label:'\(.*\)'/\1/p" | head -n1)"

echo "APK: $APK_PATH"
echo "  package:     $PKG"
echo "  versionName: $VER_NAME"
echo "  versionCode: $VER_CODE"
echo "  label:       $LABEL"

if [ "$FLAVOR" = "shanghai" ]; then
  ok=1
  if [ "$PKG" != "com.blockhub.shanghai.voice" ]; then
    echo "  FAIL expected package com.blockhub.shanghai.voice, got: $PKG"
    ok=0
  fi
  if [[ "$LABEL" != *"上海话"* ]]; then
    echo "  FAIL expected label to contain 上海话, got: $LABEL"
    ok=0
  fi
  if [ "$ok" -eq 1 ]; then
    echo "  OK  shanghai-voice flavor verified (package + label)"
    exit 0
  fi
  exit 1
fi

if [ "$FLAVOR" = "trackchat" ]; then
  ok=1
  if [ "$PKG" != "com.trackchat.runtime" ]; then
    echo "  FAIL expected package com.trackchat.runtime, got: $PKG"
    ok=0
  fi
  if [ "$ok" -eq 1 ]; then
    echo "  OK  trackchat flavor verified"
    exit 0
  fi
  exit 1
fi

echo "ERROR: unknown flavor $FLAVOR (use shanghai or trackchat)"
exit 1
