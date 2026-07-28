# APK 构建排障手册（批次 2 · M12）

## 链路

```
POST /creation/publish (deliver=app|both)
  → enqueue_apk_build() 后台线程
  → backend/uploads/apks/.build-queue/{public_id}.json
  → scripts/flutter-build-from-publish.sh
  → backend/uploads/apks/{public_id}.apk
  → GET /api/v1/runtime/{public_id}/download → 200
```

## 状态字段

| 字段 | 来源 | 含义 |
|------|------|------|
| `apk_build_status` | `/runtime/{id}`、`/runtime/{id}/config` | pending / building / ready / failed |
| `apk_ready` | 同上 | 文件是否存在 |
| HTTP 503 | `/download` | APK 尚未构建完成 |

## 常用命令

```bash
# 查看构建状态
curl -s http://124.222.177.43/api/v1/runtime/<APP_ID> | python3 -m json.tool | grep apk

# 构建队列 spec
cat backend/uploads/apks/.build-queue/<APP_ID>.json

# 构建日志
cat backend/uploads/apks/.build-status/<APP_ID>.json
cat backend/uploads/apks/.build-status/<APP_ID>.log

# 手动触发构建
bash blockhub.sh build-apk <APP_ID>

# 批次 2 验收（默认等 30 分钟）
bash blockhub.sh batch2 http://124.222.177.43

# 快速试跑（10 分钟超时）
E2E_APK_POLL_MS=600000 bash blockhub.sh batch2 http://124.222.177.43
```

## 常见失败

| 现象 | 原因 | 处理 |
|------|------|------|
| 长期 pending/building | Gradle 输出 pipe 死锁或构建慢 | `git pull` 最新 apk_builder；`watch-apk-build.sh <id> --follow` |
| 长期 building 无 log 增长 | 旧版 capture_output 卡死 | 重启 API + `pkill -f gradle` + 重跑 batch2 |
| status=failed, `No such file or directory: 'bash'` | systemd PATH 仅 venv | `apk_builder` 用 `/bin/bash` + 补 PATH；更新 `blockhub-api.service` 后 `daemon-reload` |
| status=failed | Gradle/内存/依赖或**并发构建** | 读 `.build-status/*.log`；勿同时跑 batch2 WITH_BUILD 与 E2E |
| 两个构建同时跑 | smoke-apk WITH_BUILD + publish 后台 | batch2 默认 WITH_BUILD=0；全局锁 `/tmp/blockhub-flutter-apk.lock` |
| download 503 但文件存在 | API 路径或权限 | `ls -la backend/uploads/apks/<id>.apk` |
| 503 符合预期 | 未构建 | `WITH_BUILD=1 bash scripts/smoke-apk.sh` |
| E2E 超时 | 构建 >30min | 增大 `E2E_APK_POLL_MS` 或先 `build-apk` 再测 download |

## Home UI

发布成功页与「我的应用」使用 `DeliveryProgress` 轮询 `fetchRuntimeInfo`，显示 pending/building/ready/failed。
