# shellcheck shell=bash
# 按服务器内存自动配置 Gradle / Flutter 构建（小内存机必用）

gradle_mem_total_mb() {
  awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 4096
}

gradle_swap_total_mb() {
  awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0
}

# 输出: low | standard
gradle_memory_profile() {
  local ram swap_mb
  ram="$(gradle_mem_total_mb)"
  swap_mb="$(gradle_swap_total_mb)"
  if [ "${GRADLE_LOW_MEM:-}" = "1" ]; then
    echo "low"
    return
  fi
  # 物理内存 < 3.5G 且无 swap → 低内存模式
  if [ "$ram" -lt 3500 ] && [ "$swap_mb" -lt 512 ]; then
    echo "low"
    return
  fi
  if [ "$ram" -lt 2500 ]; then
    echo "low"
    return
  fi
  echo "standard"
}

apply_gradle_memory_profile() {
  local profile heap workers parallel
  profile="$(gradle_memory_profile)"
  local ram swap_mb
  ram="$(gradle_mem_total_mb)"
  swap_mb="$(gradle_swap_total_mb)"

  if [ "$profile" = "low" ]; then
    heap="1400m"
    workers="1"
    parallel="false"
    echo "==> Gradle 低内存模式 (RAM=${ram}MB swap=${swap_mb}MB): heap=${heap} workers=${workers}"
    echo "    建议: sudo bash scripts/setup-build-swap.sh  或构建前 systemctl stop blockhub-api"
  else
    heap="2048m"
    workers="2"
    parallel="true"
    echo "==> Gradle 标准模式 (RAM=${ram}MB swap=${swap_mb}MB): heap=${heap}"
  fi

  export GRADLE_OPTS="-Xmx${heap} -XX:MaxMetaspaceSize=384m -XX:+HeapDumpOnOutOfMemoryError"
  export GRADLE_USER_HOME="${GRADLE_USER_HOME:-/tmp/gradle-home-$(id -u)}"
  mkdir -p "$GRADLE_USER_HOME"

  local gp="${1:-}/gradle.properties"
  if [ -f "$gp" ]; then
    # 临时写入构建用配置（不依赖 git）
    cat > "${gp}.build" <<EOF
org.gradle.jvmargs=-Xmx${heap} -XX:MaxMetaspaceSize=384m -XX:+HeapDumpOnOutOfMemoryError
org.gradle.daemon=false
org.gradle.parallel=${parallel}
org.gradle.workers.max=${workers}
org.gradle.caching=true
android.useAndroidX=true
android.enableJetifier=true
EOF
    export GRADLE_PROPERTIES_FILE="${gp}.build"
  fi
}

gradle_preflight_check() {
  local ram swap_mb profile
  ram="$(gradle_mem_total_mb)"
  swap_mb="$(gradle_swap_total_mb)"
  profile="$(gradle_memory_profile)"

  echo "==> 系统内存: ${ram}MB  交换分区: ${swap_mb}MB  可用: $(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo '?')MB"

  if [ "$profile" = "low" ] && [ "$swap_mb" -lt 512 ]; then
    echo "WARN: 内存偏小且无 swap，Gradle 可能 OOM 被杀。"
    echo "      执行: sudo bash scripts/setup-build-swap.sh"
    echo "      或:   sudo systemctl stop blockhub-api && 构建完成后再 start"
  fi
}

gradle_diagnose_oom() {
  local log="${1:-}"
  [ -n "$log" ] && [ -f "$log" ] || return 0
  if grep -qiE 'OutOfMemory|GC overhead|Killed process|ENOMEM|Cannot allocate memory' "$log"; then
    echo ""
    echo ">>> 疑似内存不足 (OOM)。请增加 swap 或使用低内存模式:"
    echo "    sudo bash scripts/setup-build-swap.sh"
    echo "    GRADLE_LOW_MEM=1 APP_NAME=laoliu bash scripts/flutter-build-apk.sh"
  fi
}
