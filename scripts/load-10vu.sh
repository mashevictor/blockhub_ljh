#!/usr/bin/env bash
# 10 并发虚拟用户压测（只读 catalog + health）
# 用法: bash scripts/load-10vu.sh [BASE_URL] [CONCURRENCY]
set -euo pipefail

BASE="${1:-http://127.0.0.1:8001}"
API="$BASE/api/v1"
VU="${2:-10}"
DURATION="${DURATION:-15}"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

worker() {
  local id="$1"
  local ok=0
  local fail=0
  local end=$((SECONDS + DURATION))
  while [ "$SECONDS" -lt "$end" ]; do
    if curl -sf --max-time 5 "$API/catalog/summary" >/dev/null 2>&1 \
      && curl -sf --max-time 5 "$API/health" >/dev/null 2>&1; then
      ok=$((ok + 1))
    else
      fail=$((fail + 1))
    fi
  done
  echo "$ok $fail" > "$TMPDIR/w$id"
}

echo "=========================================="
echo " Load test · $VU VU · ${DURATION}s · $BASE"
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

echo "  requests: $TOTAL (${DURATION}s)"
echo "  success:  $TOTAL_OK"
echo "  failed:   $TOTAL_FAIL"
echo "  success%: ${RATE}%"
echo "  rps:      ${RPS}"

if [ "$TOTAL_FAIL" -gt 0 ]; then
  echo "  ✗ load test had failures"
  exit 1
fi
echo "  ✓ load test passed"
echo "=========================================="
