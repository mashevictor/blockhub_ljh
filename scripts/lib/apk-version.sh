# shellcheck shell=bash
# APK 版本：从 pubspec 读取，build 号递增写入 uploads（不修改 pubspec，避免 git pull 冲突）

apk_pubspec_path() {
  local root="${1:?}"
  echo "$root/runtime-app/pubspec.yaml"
}

apk_build_counter_path() {
  local root="${1:?}"
  echo "$root/backend/uploads/apks/.shanghai-voice-build-code"
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

apk_last_built_code() {
  local root="${1:?}"
  local counter version_json
  counter="$(apk_build_counter_path "$root")"
  if [ -f "$counter" ]; then
    tr -d '\n\r' < "$counter"
    return 0
  fi
  version_json="$root/backend/uploads/apks/shanghai-voice.version.json"
  if [ -f "$version_json" ]; then
    python3 -c "import json; print(json.load(open('$version_json'))['version_code'])" 2>/dev/null || echo 0
    return 0
  fi
  echo 0
}

# 解析本次构建版本：默认在已构建版本基础上 +1，不改动 pubspec.yaml
apk_resolve_build() {
  local root="${1:?}" bump="${2:-1}"
  python3 <<PY
import json
from pathlib import Path

root = Path("$root")
pubspec = root / "runtime-app/pubspec.yaml"
text = pubspec.read_text(encoding="utf-8")
import re
m = re.search(r"^version:\s*(\d+)\.(\d+)\.(\d+)\+(\d+)\s*$", text, re.M)
if not m:
    raise SystemExit("pubspec version must be semver+build, e.g. 0.1.2+3")
major, minor, patch, pub_code = m.groups()
name = f"{major}.{minor}.{patch}"
pub_code = int(pub_code)

counter = root / "backend/uploads/apks/.shanghai-voice-build-code"
last = 0
if counter.is_file():
    try:
        last = int(counter.read_text(encoding="utf-8").strip() or "0")
    except ValueError:
        last = 0
else:
    ver_json = root / "backend/uploads/apks/shanghai-voice.version.json"
    if ver_json.is_file():
        try:
            last = int(json.loads(ver_json.read_text(encoding="utf-8")).get("version_code", 0))
        except Exception:
            last = 0

bump = "$bump" == "1"
if bump:
    code = max(last, pub_code) + 1
else:
    code = max(last, pub_code)

counter.parent.mkdir(parents=True, exist_ok=True)
counter.write_text(str(code) + "\n", encoding="utf-8")
print(name)
print(code)
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
