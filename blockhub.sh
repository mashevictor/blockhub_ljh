#!/usr/bin/env bash
# BlockHub 统一 CLI — 可从任意目录用绝对路径调用
#
# 用法（推荐绝对路径，避免 cd 到 e2e 后找不到 scripts/）:
#   bash /root/blockhub/blockhub.sh flutter-build --list
#   bash /root/blockhub/blockhub.sh ga-checklist http://101.32.209.251
#   bash /root/blockhub/blockhub.sh e2e-prep
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CMD="${1:-help}"
shift || true

run() {
  exec bash "$ROOT/scripts/$1" "${@:2}"
}

case "$CMD" in
  flutter-build|apk-custom)
    run flutter-build-custom.sh "$@"
    ;;
  ga-checklist|ga)
    run ga-checklist.sh "$@"
    ;;
  smoke-ga)
    run smoke-ga.sh "$@"
    ;;
  e2e-prep)
    run e2e-prep-browsers.sh "$@"
    ;;
  server-test)
    run server-capability-test.sh "$@"
    ;;
  signoff|ga-signoff)
    run server-ga-signoff.sh "$@"
    ;;
  help|-h|--help|*)
    cat <<EOF
BlockHub CLI · 仓库根: $ROOT

  blockhub.sh flutter-build [--list | keys [选项]]  自选能力 APK
  blockhub.sh ga-checklist [BASE_URL]               GA 八项
  blockhub.sh smoke-ga [BASE_URL]                   全量冒烟
  blockhub.sh e2e-prep                              安装 Playwright 浏览器
  blockhub.sh server-test [BASE_URL]                能力全链路验收
  blockhub.sh signoff [BASE_URL]                    GA 签字一键套件

示例:
  bash $ROOT/blockhub.sh flutter-build chat_qa,approval_flow --name "测试" --public-id t001
  SKIP_APK=1 bash $ROOT/blockhub.sh ga-checklist http://101.32.209.251

注意: 若在 e2e/ 子目录，不要用相对路径 scripts/xxx，请用上述 blockhub.sh。
EOF
    ;;
esac
