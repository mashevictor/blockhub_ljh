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
  web-packages)
    run smoke-web-packages.sh "$@"
    ;;
  secrets-check)
    run rotate-secrets-check.sh "$@"
    ;;
  pg-backup)
    run pg-backup.sh "$@"
    ;;
  health-watch|health)
    run health-watch.sh "$@"
    ;;
  batch0|verify-batch0)
    run batch0-verify.sh "$@"
    ;;
  batch1|verify-batch1)
    run batch1-verify.sh "$@"
    ;;
  batch2|verify-batch2)
    run batch2-verify.sh "$@"
    ;;
  batch3|verify-batch3)
    run batch3-verify.sh "$@"
    ;;
  batch4|verify-batch4)
    run batch4-verify.sh "$@"
    ;;
  batch5|verify-batch5)
    run batch5-verify.sh "$@"
    ;;
  build-apk|apk-from-publish)
    run flutter-build-from-publish.sh "$@"
    ;;
  migrate-tencent|tencentdb)
    run migrate-tencentdb.sh "$@"
    ;;
  help|-h|--help|*)
    cat <<EOF
BlockHub CLI · 仓库根: $ROOT

  blockhub.sh flutter-build [--list | keys [选项]]  自选能力 APK
  blockhub.sh build-apk <public_id>                 按 publish 队列构建 per-app APK
  blockhub.sh ga-checklist [BASE_URL]               GA 八项 + GA#9
  blockhub.sh smoke-ga [BASE_URL]                   全量冒烟
  blockhub.sh e2e-prep                              安装 Playwright 浏览器
  blockhub.sh server-test [BASE_URL]                能力全链路验收
  blockhub.sh signoff [BASE_URL]                    GA 签字一键套件
  blockhub.sh web-packages                          校验 13 个 Web 包
  blockhub.sh secrets-check                         JWT/生产密钥检查
  blockhub.sh pg-backup                             PostgreSQL 备份
  blockhub.sh health-watch [BASE_URL] [--strict]    健康检查（cron/告警）
  blockhub.sh batch0 [BASE_URL]                     批次0 基线验收（GA 9/9）
  blockhub.sh batch1 [BASE_URL]                     批次1 P1 生产脚本验收
  blockhub.sh batch2 [BASE_URL]                     批次2 APK 全链路（publish→download 200）
  blockhub.sh batch3                                批次3 CI / staging E2E 清单
  blockhub.sh batch4                                批次4 Flutter go_router + Melos
  blockhub.sh batch5                                批次5 Web 渲染覆盖率
  blockhub.sh migrate-tencent                       腾讯云 PG 迁移（需真实 DATABASE_URL）

示例:
  bash $ROOT/blockhub.sh flutter-build chat_qa,approval_flow --name "测试" --public-id t001
  SKIP_APK=1 bash $ROOT/blockhub.sh ga-checklist http://101.32.209.251

注意: 若在 e2e/ 子目录，不要用相对路径 scripts/xxx，请用上述 blockhub.sh。
EOF
    ;;
esac
