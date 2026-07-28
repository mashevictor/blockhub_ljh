#!/usr/bin/env bash
# 批次 4 · Flutter 模块化 / go_router 验收
#
# 用法:
#   bash blockhub.sh batch4
#   bash blockhub.sh batch4 http://124.222.177.43   # 含 GA#9 API E2E
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-}"
FAIL=0

check() {
  if [ -f "$ROOT/$1" ]; then
    echo "  ✓ $1"
  else
    echo "  ✗ missing $1"
    FAIL=$((FAIL + 1))
  fi
}

step() {
  local name="$1"
  shift
  echo ""
  echo ">>> [$name]"
  if "$@"; then
    echo ">>> ✓ $name"
  else
    echo ">>> ✗ $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "=============================================="
echo " BlockHub Batch 4 · Flutter Modular / Router"
echo "=============================================="

check "runtime-app/lib/router/capability_shell_router.dart"
check "runtime-app/lib/router/capability_routes.dart"
check "melos.yaml"

for pkg in capability_chat_qa capability_approval_flow capability_shanghai_voice capability_audit_log; do
  check "packages/$pkg/pubspec.yaml"
done

if grep -q 'createCapabilityShellRouter' "$ROOT/runtime-app/lib/app.dart" 2>/dev/null; then
  echo "  ✓ app.dart wired to go_router shell"
else
  echo "  ✗ app.dart not wired to go_router"
  FAIL=$((FAIL + 1))
fi

step "apk build profiles (voice-only / dual-module)" \
  env PYTHONPATH="$ROOT/backend" \
  bash -c '
PY="$0/backend/.venv/bin/python"
[ -x "$PY" ] || PY=python3
"$PY" - <<PY
from app.services.apk_build_profiles import android_app_id_for_public_id, resolve_apk_build_profile

v = resolve_apk_build_profile(["shanghai_voice"], public_id="abcd1234")
assert v.voice_demo and v.profile_id == "shanghai_voice", v
assert v.android_app_id == "com.blockhub.app.abcd1234", v.android_app_id
d = resolve_apk_build_profile(["chat_qa", "approval_flow"], public_id="1a2b3c4d")
assert not d.voice_demo and d.profile_id == "generic", d
assert d.android_app_id == "com.blockhub.app.a1a2b3c4d", d.android_app_id
assert android_app_id_for_public_id("ab-cd") == "com.blockhub.app.ab_cd"
print("voice-only →", v.profile_id, "voice_demo=", v.voice_demo, v.android_app_id)
print("dual-module →", d.profile_id, "voice_demo=", d.voice_demo, d.android_app_id)
PY
' "$ROOT"

if [ -n "$BASE" ]; then
  API="$BASE/api/v1"
  (cd "$ROOT/e2e" && npm install --silent 2>/dev/null || true)
  step "GA#9 manifest crop (API E2E)" \
    env E2E_API_URL="$API" E2E_BASE_URL="$BASE" \
      bash -c "cd '$ROOT/e2e' && npx playwright test tests/ga9-manifest-crop.spec.ts --reporter=line"
fi

if command -v flutter >/dev/null 2>&1; then
  step "flutter analyze (router)" \
    bash -c "cd '$ROOT/runtime-app' && flutter analyze --no-fatal-infos lib/app.dart lib/router/ lib/pages/audit_log_page.dart lib/pages/security_mask_page.dart"
else
  echo ""
  echo ">>> · flutter CLI 未安装，跳过 analyze"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Batch 4 OK"
else
  echo "⚠ Batch 4: $FAIL failed"
fi
exit "$FAIL"
