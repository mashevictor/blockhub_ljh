#!/usr/bin/env bash
# 积木仓 — 上海话语音 Agent 网页 + APK 一键打包部署
# 已升级为「真项目」交付入口，详见 scripts/ship-shanghai-project.sh
#
# 用法（服务器 ~/blockhub 执行）:
#   bash scripts/deploy-shanghai-one.sh
#   SKIP_APK=1 bash scripts/deploy-shanghai-one.sh
#   PUBLIC_URL=http://124.222.177.43 bash scripts/deploy-shanghai-one.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/scripts/ship-shanghai-project.sh" "$@"
