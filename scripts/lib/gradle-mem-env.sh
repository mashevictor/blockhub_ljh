# shellcheck shell=bash
# 按服务器内存自动配置 Gradle 构建（小内存机必用）

GRADLE_STOPPED_SERVICES=""

gradle_mem_total_mb() {
  awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 4096
}

gradle_swap_free_mb() {
  awk '/SwapFree/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0
}

gradle_mem_available_mb() {
  awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 1024
}

# low = 4G 及以下；ultra = 可用内存 < 1.5G
gradle_memory_profile() {
  local ram avail
  ram="$(gradle_mem_total_mb)"
  avail="$(gradle_mem_available_mb)"
  if [ "${GRADLE_ULTRA_MEM:-}" = "1" ]; then
    echo "ultra"
    return
  fi
  if [ "${GRADLE_LOW_MEM:-}" = "1" ] || [ "$ram" -le 4096 ]; then
    if [ "$avail" -lt 1500 ]; then
      echo "ultra"
      return
    fi
    echo "low"
    return
  fi
  echo "standard"
}

gradle_should_stop_api_for_build() {
  if [ "${BUILD_SKIP_STOP_SERVICES:-}" = "1" ]; then
    return 1
  fi
  case "${GRADLE_STOP_API_FOR_BUILD:-never}" in
    1|true|yes) return 0 ;;
    0|false|no|never) return 1 ;;
  esac
  local avail total
  avail="$(gradle_mem_available_mb)"
  total="$(gradle_mem_total_mb)"
  # auto：仅当可用内存极低时才暂停 API，避免 Gradle OOM；默认 never 不影响线上服务
  if [ "$avail" -lt 1200 ]; then
    return 0
  fi
  if [ "$total" -le 4096 ] && [ "$avail" -lt 1600 ]; then
    return 0
  fi
  return 1
}

gradle_free_memory_for_build() {
  echo "==> 释放构建内存（Gradle 守护进程 / 页缓存）"
  if gradle_should_stop_api_for_build; then
    echo "    可用内存不足 — 暂停 blockhub-api 以避免 OOM（BUILD_SKIP_STOP_SERVICES=1 可跳过）"
    for svc in blockhub-api; do
      if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet "$svc" 2>/dev/null; then
        systemctl stop "$svc" && GRADLE_STOPPED_SERVICES="${GRADLE_STOPPED_SERVICES} ${svc}"
        echo "    stopped $svc"
      fi
    done
  else
    echo "    保持 blockhub-api 运行（GRADLE_STOP_API_FOR_BUILD=1 可强制暂停）"
  fi
  if [ -x "${1:-}/gradlew" ]; then
    (cd "${1}" && ./gradlew --stop 2>/dev/null) || true
    echo "    gradlew --stop"
  fi
  sync 2>/dev/null || true
  if [ -w /proc/sys/vm/drop_caches ] 2>/dev/null; then
    echo 3 >/proc/sys/vm/drop_caches 2>/dev/null || true
  fi
  sleep 2
  echo "    可用内存: $(gradle_mem_available_mb)MB"
}

gradle_restore_stopped_services() {
  for svc in $GRADLE_STOPPED_SERVICES; do
    [ -n "$svc" ] || continue
    if command -v systemctl >/dev/null 2>&1; then
      systemctl start "$svc" 2>/dev/null && echo "==> 已恢复 $svc" || echo "WARN: 无法启动 $svc"
    fi
  done
  GRADLE_STOPPED_SERVICES=""
}

apply_gradle_memory_profile() {
  local profile heap workers parallel metaspace gp
  profile="$(gradle_memory_profile)"
  local ram avail swap_free
  ram="$(gradle_mem_total_mb)"
  avail="$(gradle_mem_available_mb)"
  swap_free="$(gradle_swap_free_mb)"

  case "$profile" in
    ultra)
      heap="1536m"
      metaspace="512m"
      workers="1"
      parallel="false"
      echo "==> Gradle 超低内存模式 (RAM=${ram}MB avail=${avail}MB) heap=${heap} metaspace=${metaspace}"
      ;;
    low)
      heap="1536m"
      metaspace="512m"
      workers="1"
      parallel="false"
      echo "==> Gradle 低内存模式 (RAM=${ram}MB avail=${avail}MB swap_free=${swap_free}MB)"
      ;;
    *)
      heap="1536m"
      metaspace="256m"
      workers="2"
      parallel="true"
      echo "==> Gradle 标准模式 (RAM=${ram}MB avail=${avail}MB)"
      ;;
  esac

  export GRADLE_OPTS="-Xmx${heap} -XX:MaxMetaspaceSize=${metaspace} -XX:+UseSerialGC -XX:+HeapDumpOnOutOfMemoryError"
  unset _JAVA_OPTIONS
  export GRADLE_MEMORY_PROFILE="$profile"
  export GRADLE_USER_HOME="${GRADLE_USER_HOME:-/tmp/gradle-home-$(id -u)}"
  export KOTLIN_DAEMON_JVM_OPTIONS="-Xmx512m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC"
  mkdir -p "$GRADLE_USER_HOME"

  gp="${1:-}/gradle.properties"
  if [ -f "$gp" ] || [ -d "$(dirname "$gp")" ]; then
    cat > "${gp}.build" <<EOF
org.gradle.jvmargs=-Xmx${heap} -XX:MaxMetaspaceSize=${metaspace} -XX:+UseSerialGC -XX:+HeapDumpOnOutOfMemoryError
org.gradle.daemon=false
org.gradle.parallel=${parallel}
org.gradle.workers.max=${workers}
org.gradle.caching=true
kotlin.daemon.jvmargs=-Xmx512m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC
kotlin.compiler.execution.strategy=in-process
kotlin.build.report.enable=false
android.useAndroidX=true
android.enableJetifier=false
android.enableR8.fullMode=false
android.lint.checkReleaseBuilds=false
android.lint.checkDependencies=false
android.suppressUnsupportedCompileSdk=36
EOF
  fi
}

gradle_preflight_check() {
  local ram avail swap_free profile
  ram="$(gradle_mem_total_mb)"
  avail="$(gradle_mem_available_mb)"
  swap_free="$(gradle_swap_free_mb)"
  profile="$(gradle_memory_profile)"

  echo "==> 系统: RAM=${ram}MB  可用=${avail}MB  swap剩余=${swap_free}MB  CPU=$(grep -c processor /proc/cpuinfo 2>/dev/null || echo '?')核  profile=${profile}"

  if [ "$profile" = "ultra" ] || [ "$profile" = "low" ]; then
    echo "    小内存机：默认不停 blockhub-api；若 OOM 可 GRADLE_STOP_API_FOR_BUILD=1"
    echo "    或改用 GitHub Actions 构建 APK"
  fi
  if dmesg 2>/dev/null | tail -30 | grep -qi 'killed process'; then
    echo "WARN: 近期有进程被 OOM Killer 杀掉 — dmesg | tail -20"
  fi
}

gradle_diagnose_oom() {
  local log="${1:-}"
  [ -n "$log" ] && [ -f "$log" ] || return 0
  if grep -qi 'JetifyTransform\|Java heap space' "$log"; then
    echo ""
    echo ">>> Jetifier/堆内存不足：本仓库已关闭 android.enableJetifier（Flutter 原生库勿再 Jetify）。"
    echo "    git pull 后执行:"
    echo "    GRADLE_STOP_API_FOR_BUILD=1 GRADLE_ULTRA_MEM=1 bash scripts/build-shanghai-voice-apk.sh"
    return 0
  fi
  if grep -qi 'OutOfMemoryError: Metaspace\|Metaspace' "$log"; then
    echo ""
    echo ">>> Metaspace 不足（类元数据区，非堆内存）。已在本仓库禁用 release lint、提高 MaxMetaspaceSize。"
    echo "    请 git pull 后重试，并确保未设置全局 _JAVA_OPTIONS："
    echo "    unset _JAVA_OPTIONS"
    echo "    GRADLE_ULTRA_MEM=1 APP_NAME=laoliu bash scripts/flutter-build-apk.sh"
    echo "    或 GitHub → Actions → Flutter APK Build"
    return 0
  fi
  if grep -qiE 'OutOfMemory|GC overhead|Killed process|ENOMEM|Cannot allocate memory|daemon disappeared|DaemonDisappearedException' "$log"; then
    echo ""
    echo ">>> 内存不足：Gradle 守护进程被系统杀掉。请:"
    echo "    GRADLE_STOP_API_FOR_BUILD=1 GRADLE_ULTRA_MEM=1 APP_NAME=laoliu bash scripts/flutter-build-apk.sh"
    echo "    或 GitHub → Actions → Flutter APK Build → Run workflow"
    dmesg 2>/dev/null | tail -5 | grep -i kill || true
  fi
}
