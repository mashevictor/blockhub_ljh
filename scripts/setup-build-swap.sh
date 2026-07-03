#!/usr/bin/env bash
# 为小内存服务器添加 2GB swap（APK 构建 Gradle 需要）
# 用法: sudo bash scripts/setup-build-swap.sh
set -euo pipefail

SWAP_SIZE="${SWAP_SIZE:-2G}"
SWAP_FILE="${SWAP_FILE:-/swapfile}"

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 sudo 运行"
  exit 1
fi

RAM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
SWAP_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
echo "当前: RAM=${RAM_MB}MB  Swap=${SWAP_MB}MB"

if [ "$SWAP_MB" -ge 1024 ]; then
  echo "已有足够 swap (${SWAP_MB}MB)，跳过"
  swapon --show 2>/dev/null || true
  exit 0
fi

if [ -f "$SWAP_FILE" ]; then
  echo "swap 文件已存在: $SWAP_FILE"
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE" 2>/dev/null || true
  swapon "$SWAP_FILE" 2>/dev/null || true
else
  echo "==> 创建 ${SWAP_SIZE} swap @ $SWAP_FILE"
  fallocate -l "$SWAP_SIZE" "$SWAP_FILE" || dd if=/dev/zero of="$SWAP_FILE" bs=1M count=2048
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE"
  swapon "$SWAP_FILE"
fi

if ! grep -q "$SWAP_FILE" /etc/fstab 2>/dev/null; then
  echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
  echo "已写入 /etc/fstab（重启后自动挂载）"
fi

# 降低 swap 使用倾向，平时仍优先用物理内存
sysctl vm.swappiness=10 2>/dev/null || true
grep -q 'vm.swappiness' /etc/sysctl.conf 2>/dev/null || echo 'vm.swappiness=10' >> /etc/sysctl.conf

echo "完成:"
swapon --show
free -h
