#!/usr/bin/env bash
# build_manifest 约定冒烟（GA#9 / flutter_pkg 推导）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="python3"
if [ -x "$ROOT/backend/.venv/bin/python" ]; then
  PY="$ROOT/backend/.venv/bin/python"
fi

cd "$ROOT/backend"
"$PY" <<'PY'
from app.services.build_manifest import build_manifest

voice = build_manifest(["shanghai_voice"])
assert voice["capability_keys"] == ["shanghai_voice"], voice
assert voice["web_pkgs"] == ["@blockhub/web-capability-voice"], voice
assert voice["flutter_pkgs"] == ["capability_shanghai_voice"], voice
assert voice["widgets"] == ["ShanghaiVoiceWidget"], voice

dual = build_manifest(["chat_qa", "shanghai_voice"])
assert dual["capability_keys"] == ["chat_qa", "shanghai_voice"], dual
assert set(dual["web_pkgs"]) == {
    "@blockhub/web-capability-chat",
    "@blockhub/web-capability-voice",
}, dual
assert dual["flutter_pkgs"] == [
    "capability_chat_qa",
    "capability_shanghai_voice",
], dual

empty = build_manifest([])
assert empty["capability_keys"] == ["chat_qa"], empty

print("OK build_manifest conventions")
PY

echo "==> smoke-build-manifest passed"
