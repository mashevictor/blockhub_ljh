# shellcheck shell=bash
# 按服务器内存自动配置 Gradle 构建（小内存机必用）

gradle_mem_total_mb() {
  awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 4096
}

gradle_swap_free_mb() {
  awk '/SwapFree/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0
}

gradle_mem_available_mb() {
  awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 1024
}

gradle_memory_profile() {
  local ram avail swap_free
  ram="$(gradle_mem_total_mb)"
  avail="$(gradle_mem_available_mb)"
  swap_free="$(gradle_swap_free_mb)"
  if [ "${GRADLE_LOW_MEM:-}" = "1" ]; then
    echo "low"
    return
  fi
  if [ "$ram" -le 4096 ] || [ "$avail" -lt 1200 ] || [ "$swap_free" -lt 256 ]; then
    echo "low"
    return
  fi
  echo "standard"
}

apply_gradle_memory_profile() {
  local profile heap workers parallel
  profile="$(gradle_memory_profile)"
  local ram avail swap_free
  ram="$(gradle_mem_total_mb)"
  avail="$(gradle_mem_available_mb)"
  swap_free="$(gradle_swap_free_mb)"

  if [ "$profile" = "low" ]; then
    heap="1024m"
    workers="1"
    parallel="false"
    echo "==> Gradle 低内存模式 (RAM=${ram}MB avail=${avail}MB swap_free=${swap_free}MB)"
    echo "    heap=${heap} workers=${workers} — 构建前建议: systemctl stop blockhub-api"
  else
    heap="1536m"
    workers="2"
    parallel="true"
    echo "==> Gradle 标准模式 (RAM=${ram}MB avail=${avail}MB)"
  fi

  export GRADLE_OPTS="-Xmx${heap} -XX:MaxMetaspaceSize=256m -XX:+HeapDumpOnOutOfMemoryError"
  export GRADLE_USER_HOME="${GRADLE_USER_HOME:-/tmp/gradle-home-$(id -u)}"
  mkdir -p "$GRADLE_USER_HOME"

  local gp="${1:-}/gradle.properties"
  if [ -f "$gp" ] || [ -d "$(dirname "$gp")" ]; then
    cat > "${gp}.build" <<EOF
org.gradle.jvmargs=-Xmx${heap} -XX:MaxMetaspaceSize=256m -XX:+HeapDumpOnOutOfMemoryError
org.gradle.daemon=false
org.gradle.parallel=${parallel}
org.gradle.workers.max=${workers}
org.gradle.caching=true
android.useAndroidX=true
android.enableJetifier=true
EOF
  fi
}

gradle_preflight_check() {
  local ram avail swap_free profile
  ram="$(gradle_mem_total_mb)"
  avail="$(gradle_mem_available_mb)"
  swap_free="$(gradle_swap_free_mb)"
  profile="$(gradle_memory_profile)"

  echo "==> 系统: RAM=${ram}MB  可用=${avail}MB  swap剩余=${swap_free}MB  CPU=$(grep -c processor /proc/cpuinfo 2>/dev/null || echo '?')核"

  if [ "$profile" = "low" ]; then
    echo "WARN: 小内存环境 — 构建前释放内存:"
    echo "  sudo systemctl stop blockhub-api"
    echo "  sync && echo 3 | sudo tee /proc/sys/vm/drop_caches   # 可选，清缓存"
    if [ "$swap_free" -lt 256 ]; then
      echo "WARN: swap 几乎用尽 — 建议: sudo bash scripts/setup-build-swap.sh  (扩到 4G)"
    fi
  fi
}

gradle_diagnose_oom() {
  local log="${1:-}"
  [ -n "$log" ] && [ -f "$log" ] || return 0
  if grep -qiE 'OutOfMemory|GC overhead|Killed process|ENOMEM|Cannot allocate memory|Gradle build daemon disappeared' "$log"; then
    echo ""
    echo ">>> 疑似内存不足 (OOM)。2核/4G 机请:"
    echo "    sudo systemctl stop blockhub-api"
    echo "    GRADLE_LOW_MEM=1 APP_NAME=laoliu bash scripts/flutter-build-apk.sh"
    echo "    sudo systemctl start blockhub-api"
  fi
}
