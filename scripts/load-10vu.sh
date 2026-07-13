#!/usr/bin/env bash
# 10 并发虚拟用户压测（只读 catalog + health）+ P95 延迟阈值
# 用法: bash scripts/load-10vu.sh [BASE_URL] [CONCURRENCY]
# 环境变量:
#   DURATION=15          压测秒数
#   P95_MAX_SEC=2.0      P95 上限（秒）
#   SUCCESS_MIN_PCT=99   最低成功率
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"
VU="${2:-10}"
DURATION="${DURATION:-15}"
P95_MAX_SEC="${P95_MAX_SEC:-2.0}"
SUCCESS_MIN_PCT="${SUCCESS_MIN_PCT:-99}"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

worker() {
  local id="$1"
  local ok=0
  local fail=0
  local end=$((SECONDS + DURATION))
  while [ "$SECONDS" -lt "$end" ]; do
    local t1 t2 t
    t1=$(curl -sf -o /dev/null -w '%{time_total}' --max-time 5 "$API/catalog/summary" 2>/dev/null || echo "")
    t2=$(curl -sf -o /dev/null -w '%{time_total}' --max-time 5 "$API/health" 2>/dev/null || echo "")
    if [ -n "$t1" ] && [ -n "$t2" ]; then
      ok=$((ok + 1))
      t=$(python3 -c "print(float('$t1') + float('$t2'))")
      echo "$t" >> "$TMPDIR/latency_$id"
    else
      fail=$((fail + 1))
    fi
  done
  echo "$ok $fail" > "$TMPDIR/w$id"
}

echo "=========================================="
echo " Load test · $VU VU · ${DURATION}s · $BASE"
echo " P95 max: ${P95_MAX_SEC}s · success min: ${SUCCESS_MIN_PCT}%"
echo "=========================================="

SECONDS=0
for i in $(seq 1 "$VU"); do
  worker "$i" &
done
wait

TOTAL_OK=0
TOTAL_FAIL=0
for f in "$TMPDIR"/w*; do
  read -r o f2 < "$f"
  TOTAL_OK=$((TOTAL_OK + o))
  TOTAL_FAIL=$((TOTAL_FAIL + f2))
done

TOTAL=$((TOTAL_OK + TOTAL_FAIL))
if [ "$TOTAL" -eq 0 ]; then
  echo "  ✗ no requests completed"
  exit 1
fi

RATE=$(python3 -c "print(f'{$TOTAL_OK/$TOTAL*100:.1f}')")
RPS=$(python3 -c "print(f'{$TOTAL/$DURATION:.1f}')")

LAT_FILE="$TMPDIR/all_latencies.txt"
cat "$TMPDIR"/latency_* 2>/dev/null > "$LAT_FILE" || true

read -r P50 P95 P99 LAT_COUNT <<PYOUT
$(python3 <<PY
import os
path = "$LAT_FILE"
vals = []
if os.path.isfile(path):
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    vals.append(float(line))
                except ValueError:
                    pass
if not vals:
    print("0 0 0 0")
else:
    vals.sort()
    def pct(p):
        i = int(round((len(vals) - 1) * p))
        return vals[i]
    print(f"{pct(0.50):.3f} {pct(0.95):.3f} {pct(0.99):.3f} {len(vals)}")
PY
)
PYOUT

echo "  requests: $TOTAL (${DURATION}s)"
echo "  success:  $TOTAL_OK"
echo "  failed:   $TOTAL_FAIL"
echo "  success%: ${RATE}%"
echo "  rps:      ${RPS}"
if [ "$LAT_COUNT" -gt 0 ] 2>/dev/null; then
  echo "  latency samples: $LAT_COUNT"
  echo "  p50:      ${P50}s"
  echo "  p95:      ${P95}s"
  echo "  p99:      ${P99}s"
fi

EXIT=0
if [ "$TOTAL_FAIL" -gt 0 ]; then
  echo "  ✗ load test had failures"
  EXIT=1
fi

if [ "$LAT_COUNT" -gt 0 ] 2>/dev/null; then
  if python3 -c "import sys; sys.exit(0 if float('$P95') <= float('$P95_MAX_SEC') else 1)"; then
    echo "  ✓ p95 <= ${P95_MAX_SEC}s"
  else
    echo "  ✗ p95 ${P95}s exceeds ${P95_MAX_SEC}s"
    EXIT=1
  fi
fi

if python3 -c "import sys; sys.exit(0 if float('$RATE') >= float('$SUCCESS_MIN_PCT') else 1)"; then
  echo "  ✓ success% >= ${SUCCESS_MIN_PCT}%"
else
  echo "  ✗ success% ${RATE}% below ${SUCCESS_MIN_PCT}%"
  EXIT=1
fi

if [ "$EXIT" -eq 0 ]; then
  echo "  ✓ load test passed"
fi
echo "=========================================="
exit "$EXIT"
