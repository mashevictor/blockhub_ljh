#!/usr/bin/env bash
# 为小内存服务器扩容 swap（APK 构建 Gradle 峰值约 2~3GB）
# 用法: sudo bash scripts/setup-build-swap.sh
set -euo pipefail

SWAP_SIZE="${SWAP_SIZE:-4G}"
SWAP_FILE="${SWAP_FILE:-/swapfile}"

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 sudo 运行"
  exit 1
fi

RAM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
SWAP_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
echo "当前: RAM=${RAM_MB}MB  Swap=${SWAP_MB}MB"

if [ "$SWAP_MB" -ge 3500 ]; then
  echo "swap 已 >= 3.5G，跳过"
  swapon --show 2>/dev/null || true
  exit 0
fi

echo "==> 重建 ${SWAP_SIZE} swap @ $SWAP_FILE"
swapoff "$SWAP_FILE" 2>/dev/null || true
rm -f "$SWAP_FILE"
fallocate -l "$SWAP_SIZE" "$SWAP_FILE" 2>/dev/null || dd if=/dev/zero of="$SWAP_FILE" bs=1M count=4096 status=progress
chmod 600 "$SWAP_FILE"
mkswap "$SWAP_FILE"
swapon "$SWAP_FILE"

if grep -q "$SWAP_FILE" /etc/fstab 2>/dev/null; then
  sed -i "\|$SWAP_FILE|d" /etc/fstab
fi
echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab

sysctl -w vm.swappiness=10 2>/dev/null || true
grep -q 'vm.swappiness' /etc/sysctl.conf 2>/dev/null || echo 'vm.swappiness=10' >> /etc/sysctl.conf

echo "完成:"
swapon --show
free -h
