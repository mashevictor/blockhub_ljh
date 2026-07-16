#!/usr/bin/env bash
# 弹幕全链路冒烟（调 API）
# 用法:
#   bash scripts/smoke-danmaku.sh
#   bash scripts/smoke-danmaku.sh https://blockhub.club
#   bash scripts/smoke-danmaku.sh http://127.0.0.1:8001
set -euo pipefail
BASE="${1:-http://127.0.0.1:8001}"
if [[ "$BASE" == *"/api/v1"* ]]; then
  URL="${BASE%/}/smoke/danmaku"
else
  URL="${BASE%/}/api/v1/smoke/danmaku"
fi
echo "GET $URL"
curl -sS "$URL" | python3 -c '
import json,sys
d=json.load(sys.stdin)
s=d.get("summary") or {}
print("ok=", d.get("ok"))
print("presets=", s.get("presets"), "modules=", s.get("unique_modules"))
print("capability_failures=", s.get("capability_failures"), "preset_match_failures=", s.get("preset_match_failures"))
print("db_ok=", s.get("db_ok"), "elapsed_ms=", s.get("elapsed_ms"))
fails=[c["key"] for c in d.get("capabilities") or [] if not c.get("ok")]
pfails=[p["id"]+":"+p.get("label","") for p in d.get("presets") or [] if not p.get("ok")]
if fails:
  print("FAIL caps:", ", ".join(fails))
if pfails:
  print("FAIL presets:", ", ".join(pfails[:12]), ("..." if len(pfails)>12 else ""))
sys.exit(0 if d.get("ok") else 1)
'
