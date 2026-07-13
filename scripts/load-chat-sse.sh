#!/usr/bin/env bash
# D32 · 10 并发 chat SSE 压测 + Redis 限流友好阈值
#
# 用法:
#   bash scripts/load-chat-sse.sh http://101.32.209.251
#   VU=10 DURATION=20 bash scripts/load-chat-sse.sh http://127.0.0.1:8001
#
# 环境变量:
#   VU=10                并发数
#   DURATION=15          每 worker 持续时间（秒）
#   SSE_FIRST_BYTE_MAX=8 首包 SSE 最大秒数
#   SUCCESS_MIN_PCT=95   最低成功率
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"
VU="${VU:-10}"
DURATION="${DURATION:-15}"
SSE_FIRST_BYTE_MAX="${SSE_FIRST_BYTE_MAX:-8}"
SUCCESS_MIN_PCT="${SUCCESS_MIN_PCT:-95}"
EMAIL="${LOAD_TEST_EMAIL:-admin@trackchat.local}"
PASS="${LOAD_TEST_PASSWORD:-admin123}"

echo "=============================================="
echo " Chat SSE Load · $VU VU · ${DURATION}s"
echo " Base: $BASE"
echo " first-byte max: ${SSE_FIRST_BYTE_MAX}s · success min: ${SUCCESS_MIN_PCT}%"
echo "=============================================="

python3 - "$API" "$VU" "$DURATION" "$SSE_FIRST_BYTE_MAX" "$SUCCESS_MIN_PCT" "$EMAIL" "$PASS" <<'PY'
import json
import ssl
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

api, vu, duration, fb_max, min_pct, email, password = sys.argv[1:8]
vu = int(vu)
duration = int(duration)
fb_max = float(fb_max)
min_pct = float(min_pct)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def login() -> str:
    body = json.dumps({"email": email, "password": password}).encode()
    req = urllib.request.Request(
        f"{api}/auth/login",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        data = json.loads(resp.read().decode())
    token = data.get("access_token")
    if not token:
        raise RuntimeError("login failed: no access_token")
    return token


def one_stream(token: str, worker_id: int, seq: int) -> tuple[bool, float, str]:
    payload = json.dumps(
        {
            "message": f"loadtest w{worker_id} #{seq}",
            "session_id": f"load-{worker_id}-{int(time.time())}",
            "model": "doubao-seed-2-0-mini",
            "use_rag": False,
        }
    ).encode()
    req = urllib.request.Request(
        f"{api}/chat/completions/stream",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "Accept": "text/event-stream",
        },
        method="POST",
    )
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=fb_max + 5) as resp:
            if resp.status >= 400:
                return False, time.perf_counter() - t0, f"http_{resp.status}"
            got = False
            for raw in resp:
                if time.perf_counter() - t0 > fb_max:
                    return False, time.perf_counter() - t0, "first_byte_timeout"
                line = raw.decode(errors="replace").strip()
                if line.startswith("data:") and len(line) > 5:
                    got = True
                    break
            if not got:
                return False, time.perf_counter() - t0, "no_sse_data"
            return True, time.perf_counter() - t0, "ok"
    except urllib.error.HTTPError as e:
        return False, time.perf_counter() - t0, f"http_{e.code}"
    except Exception as e:
        return False, time.perf_counter() - t0, type(e).__name__


def worker(token: str, wid: int) -> tuple[int, int, list[float], dict[str, int]]:
    ok = fail = 0
    latencies: list[float] = []
    errors: dict[str, int] = {}
    end = time.time() + duration
    seq = 0
    while time.time() < end:
        seq += 1
        success, lat, err = one_stream(token, wid, seq)
        if success:
            ok += 1
            latencies.append(lat)
        else:
            fail += 1
            errors[err] = errors.get(err, 0) + 1
        time.sleep(0.2)
    return ok, fail, latencies, errors


print(">>> login...")
token = login()
print(">>> ✓ token acquired")

total_ok = total_fail = 0
all_lat: list[float] = []
all_errors: dict[str, int] = {}

with ThreadPoolExecutor(max_workers=vu) as pool:
    futs = [pool.submit(worker, token, i + 1) for i in range(vu)]
    for f in as_completed(futs):
        o, fl, lats, errs = f.result()
        total_ok += o
        total_fail += fl
        all_lat.extend(lats)
        for k, v in errs.items():
            all_errors[k] = all_errors.get(k, 0) + v

total = total_ok + total_fail
rate = (total_ok / total * 100) if total else 0
print(f"\nrequests: {total}  ok: {total_ok}  fail: {total_fail}  success: {rate:.1f}%")
if all_errors:
    print("errors:", ", ".join(f"{k}={v}" for k, v in sorted(all_errors.items())))

if all_lat:
    all_lat.sort()
    p50 = all_lat[len(all_lat) // 2]
    p95 = all_lat[int(len(all_lat) * 0.95)]
    print(f"first-byte latency: p50={p50:.3f}s p95={p95:.3f}s samples={len(all_lat)}")

exit_code = 0
if total_fail > 0:
    print(f"✗ failures: {total_fail}")
    exit_code = 1
if rate < min_pct:
    print(f"✗ success {rate:.1f}% < {min_pct}%")
    exit_code = 1
if all_lat and p95 > fb_max:
    print(f"✗ p95 {p95:.3f}s > {fb_max}s")
    exit_code = 1
if exit_code == 0:
    print("✓ chat SSE load passed")
sys.exit(exit_code)
PY
