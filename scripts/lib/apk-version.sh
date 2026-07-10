# shellcheck shell=bash
# 从 runtime-app/pubspec.yaml 读取/递增 APK 版本

apk_pubspec_path() {
  local root="${1:?}"
  echo "$root/runtime-app/pubspec.yaml"
}

apk_read_version() {
  local pubspec
  pubspec="$(apk_pubspec_path "${1:?}")"
  python3 <<PY
import re
from pathlib import Path
text = Path("$pubspec").read_text(encoding="utf-8")
m = re.search(r"^version:\s*(\S+)", text, re.M)
if not m:
    raise SystemExit("version line missing in pubspec.yaml")
full = m.group(1).strip()
if "+" in full:
    name, code = full.split("+", 1)
else:
    name, code = full, "1"
parts = name.split(".")
while len(parts) < 3:
    parts.append("0")
major, minor, patch = parts[0], parts[1], parts[2]
print(f"{major}.{minor}.{patch}")
print(int(code))
PY
}

apk_bump_build() {
  local root="${1:?}"
  local pubspec
  pubspec="$(apk_pubspec_path "$root")"
  python3 <<PY
import re
from pathlib import Path
p = Path("$pubspec")
text = p.read_text(encoding="utf-8")
m = re.search(r"^version:\s*(\d+)\.(\d+)\.(\d+)\+(\d+)\s*$", text, re.M)
if not m:
    raise SystemExit("pubspec version must be semver+build, e.g. 0.1.1+2")
major, minor, patch, build = m.groups()
build = str(int(build) + 1)
new_line = f"version: {major}.{minor}.{patch}+{build}"
text = re.sub(r"^version:\s*\S+\s*$", new_line, text, count=1, flags=re.M)
p.write_text(text, encoding="utf-8")
print(f"{major}.{minor}.{patch}")
print(build)
PY
}

apk_cleanup_shanghai_artifacts() {
  local root="${1:?}"
  local apk_dir="$root/backend/uploads/apks"
  mkdir -p "$apk_dir"
  echo "==> 清理旧上海话 APK 产物"
  rm -f "$apk_dir/shanghai-voice.apk" "$apk_dir/shanghai-voice.version.json" 2>/dev/null || true
  rm -f "$apk_dir"/shanghai-voice-*.apk 2>/dev/null || true
  rm -rf "$root/runtime-app/build" 2>/dev/null || true
}

apk_write_shanghai_manifest() {
  local root="${1:?}" apk_path="${2:?}" version_name="${3:?}" version_code="${4:?}"
  local apk_dir="$root/backend/uploads/apks"
  local git_sha bytes built_at
  git_sha="$(git -C "$root" rev-parse --short HEAD 2>/dev/null || echo unknown)"
  bytes="$(wc -c < "$apk_path" | tr -d ' ')"
  built_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  python3 <<PY
import json
from pathlib import Path
payload = {
    "flavor": "shanghai-voice",
    "app_name": "上海话语音助手",
    "package": "com.blockhub.shanghai.voice",
    "version_name": "$version_name",
    "version_code": int("$version_code"),
    "built_at": "$built_at",
    "git": "$git_sha",
    "apk_file": "shanghai-voice.apk",
    "apk_archive": "shanghai-voice-${version_name}+${version_code}.apk",
    "apk_bytes": int("$bytes"),
}
out = Path("$apk_dir/shanghai-voice.version.json")
out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
Path("$apk_dir/shanghai-voice.version.txt").write_text(
    f"{payload['version_name']}+{payload['version_code']}\n", encoding="utf-8"
)
print(json.dumps(payload, ensure_ascii=False))
PY
}
