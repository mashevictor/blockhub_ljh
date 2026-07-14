#!/usr/bin/env bash
# 验收：每应用唯一 Android applicationId（清单 1–7）
#
# 用法：
#   bash scripts/smoke-per-app-application-id.sh
#   # 可选：装完两包后
#   APK_A=/path/a.apk APK_B=/path/b.apk bash scripts/smoke-per-app-application-id.sh --device
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

step() { echo ""; echo ">>> $*"; }

step "1) 规则：public_id → com.blockhub.app.{slug}"
PY="$ROOT/backend/.venv/bin/python"
[ -x "$PY" ] || PY=python3
PYTHONPATH="$ROOT/backend" "$PY" - <<'PY'
from app.services.apk_build_profiles import android_app_id_for_public_id, resolve_apk_build_profile

assert android_app_id_for_public_id("abcd1234") == "com.blockhub.app.abcd1234"
assert android_app_id_for_public_id("1a2b3c4d") == "com.blockhub.app.a1a2b3c4d"
assert android_app_id_for_public_id("Ab-Cd!") == "com.blockhub.app.ab_cd"
a = resolve_apk_build_profile(["shanghai_voice"], public_id="deadbeef")
b = resolve_apk_build_profile(["chat_qa"], public_id="cafebabe")
assert a.android_app_id != b.android_app_id
assert a.voice_demo and not b.voice_demo
print("OK rules + profile shell vs unique package")
PY

step "2) build_spec 写入 android_app_id"
PYTHONPATH="$ROOT/backend" "$PY" - <<'PY'
from app.services.apk_builder import build_spec_from_app, _spec_fingerprint

spec = build_spec_from_app({
    "id": "cafe0001",
    "name": "测试",
    "capability_keys": ["chat_qa"],
    "app_ui_id": "bottom_tabs",
    "deliver": "both",
})
assert spec["android_app_id"] == "com.blockhub.app.cafe0001"
fp1 = _spec_fingerprint(spec)
spec2 = dict(spec)
spec2["capability_keys"] = ["shanghai_voice"]
assert _spec_fingerprint(spec2) != fp1
print("OK build_spec + fingerprint", spec["android_app_id"], fp1)
PY

step "3) Gradle 可被 -PandroidAppId 覆盖（静态检查）"
grep -q 'applicationId androidAppId' "$ROOT/runtime-app/android/app/build.gradle"
grep -q 'androidAppId' "$ROOT/scripts/flutter-build-apk.sh"
grep -q 'APP_ID' "$ROOT/scripts/flutter-build-from-publish.sh"
echo "OK gradle / scripts wire"

if [ "${1:-}" = "--device" ]; then
  step "4) 设备侧：两 APK 并存安装（需 APK_A / APK_B）"
  : "${APK_A:?set APK_A}"
  : "${APK_B:?set APK_B}"
  command -v adb >/dev/null || { echo "adb missing"; exit 1; }
  ID_A=$(aapt dump badging "$APK_A" 2>/dev/null | sed -n "s/.*package: name='\([^']*\)'.*/\1/p" | head -1)
  ID_B=$(aapt dump badging "$APK_B" 2>/dev/null | sed -n "s/.*package: name='\([^']*\)'.*/\1/p" | head -1)
  if [ -z "$ID_A" ] || [ -z "$ID_B" ]; then
    echo "WARN: aapt unavailable; install both and check:"
    echo "  adb install -r \$APK_A && adb install -r \$APK_B"
    echo "  adb shell pm list packages | grep blockhub.app"
    exit 0
  fi
  echo "  A=$ID_A"
  echo "  B=$ID_B"
  [ "$ID_A" != "$ID_B" ] || { echo "FAIL: same package"; exit 1; }
  adb install -r "$APK_A"
  adb install -r "$APK_B"
  adb shell pm list packages | grep -E "$(printf '%s|%s' "$ID_A" "$ID_B")" || true
  echo "OK side-by-side install"
fi

echo ""
echo "=== 验收清单（人工）==="
echo " [ ] 发布应用 A/B，runtime.android_app_id 分别为 com.blockhub.app.{id}"
echo " [ ] 首页发布成功页展示包名"
echo " [ ] 下载两包可并存安装（不覆盖）"
echo " [ ] 改选型再发布 → fingerprint 变更 → APK 重建"
echo " [ ] 相同选型再发布 → 已有 APK 则跳过重建"
echo "DONE"
