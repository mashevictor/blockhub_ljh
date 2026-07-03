# shellcheck shell=bash
# Source from setup-flutter-android.sh / flutter-build-apk.sh
# Detect Android SDK (e.g. /root/Android or /root/Android/Sdk) and wire Flutter + Gradle.

_android_sdk_is_valid() {
  local d="${1%/}"
  [ -n "$d" ] && [ -d "$d" ] || return 1
  [ -d "$d/platform-tools" ] || [ -d "$d/platforms" ] || [ -d "$d/build-tools" ] || [ -d "$d/cmdline-tools" ]
}

_android_sdk_candidates() {
  local home="${HOME:-/root}"
  printf '%s\n' \
    "${ANDROID_HOME:-}" \
    "${ANDROID_SDK_ROOT:-}" \
    "/root/Android/Sdk" \
    "/root/Android" \
    "$home/Android/Sdk" \
    "$home/Android" \
    "/usr/local/android-sdk" \
    "/opt/android-sdk"
}

find_android_sdk() {
  local c
  while IFS= read -r c; do
    [ -n "$c" ] || continue
    if _android_sdk_is_valid "$c"; then
      printf '%s' "${c%/}"
      return 0
    fi
  done < <(_android_sdk_candidates | awk '!seen[$0]++')
  return 1
}

find_sdkmanager() {
  local sdk="${1:-}"
  local p
  for p in \
    "$sdk/cmdline-tools/latest/bin/sdkmanager" \
    "$sdk/cmdline-tools/bin/sdkmanager" \
    "$sdk/tools/bin/sdkmanager"; do
    if [ -x "$p" ]; then
      printf '%s' "$p"
      return 0
    fi
  done
  if command -v sdkmanager >/dev/null 2>&1; then
    command -v sdkmanager
    return 0
  fi
  return 1
}

# Export ANDROID_HOME / ANDROID_SDK_ROOT, flutter config, runtime-app local.properties
configure_android_sdk() {
  local sdk app_dir="${1:-}"
  sdk="$(find_android_sdk)" || {
    echo "ERROR: Android SDK not found."
    echo "  Your server has ~/Android — set explicitly:"
    echo "    export ANDROID_HOME=/root/Android   # or /root/Android/Sdk if platform-tools is inside Sdk"
    echo "    flutter config --android-sdk \"\$ANDROID_HOME\""
    echo "  Then re-run: sudo bash scripts/setup-flutter-android.sh"
    return 1
  }

  export ANDROID_HOME="$sdk"
  export ANDROID_SDK_ROOT="$sdk"
  export PATH="$sdk/platform-tools:$sdk/cmdline-tools/latest/bin:$sdk/cmdline-tools/bin:$PATH"

  echo "==> Android SDK: $ANDROID_HOME"
  if [ -x "$sdk/platform-tools/adb" ]; then
    echo "    platform-tools: OK"
  else
    echo "    WARN: platform-tools missing under $sdk"
  fi

  if command -v flutter >/dev/null 2>&1; then
    flutter config --android-sdk "$ANDROID_HOME" >/dev/null 2>&1 || true
    echo "    flutter config --android-sdk $ANDROID_HOME"
  fi

  if [ -n "$app_dir" ] && [ -d "$app_dir/android" ]; then
    local lp="$app_dir/android/local.properties"
    local flutter_sdk=""
    if command -v flutter >/dev/null 2>&1; then
      flutter_sdk="$(dirname "$(dirname "$(command -v flutter)")")"
    fi
    {
      echo "sdk.dir=${ANDROID_HOME//\\/\\\\}"
      if [ -n "$flutter_sdk" ]; then
        echo "flutter.sdk=${flutter_sdk//\\/\\\\}"
      fi
    } > "$lp"
    echo "    wrote $lp"
  fi

  return 0
}

accept_android_licenses() {
  local sdk="${ANDROID_HOME:-}"
  local sm
  sm="$(find_sdkmanager "$sdk" 2>/dev/null || true)"
  if [ -n "$sm" ]; then
    echo "==> Accepting SDK licenses via $sm ..."
    yes | "$sm" --sdk_root="$sdk" --licenses >/dev/null 2>&1 || true
    "$sm" --sdk_root="$sdk" "platform-tools" "platforms;android-35" "build-tools;35.0.0" 2>/dev/null || true
  fi
  if command -v flutter >/dev/null 2>&1; then
    yes | flutter doctor --android-licenses >/dev/null 2>&1 || true
  fi
}
