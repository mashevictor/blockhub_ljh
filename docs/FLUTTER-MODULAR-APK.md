# Flutter 模块化 APK（阶段 5）

> GA 后交付：per-app APK 按 `capability_keys` 裁剪菜单与编译配置，减小体积。

## 架构

```
POST /creation/publish
  → build_manifest.flutter_pkgs + capability_keys
  → backend/uploads/apks/.build-queue/{public_id}.json
  → scripts/flutter-build-from-publish.sh
  → CAPABILITY_KEYS dart-define + split-per-abi
  → backend/uploads/apks/{public_id}.apk
```

## 构建命令

```bash
# 通用演示 APK
bash scripts/flutter-build-apk.sh

# 按发布队列构建 per-app APK（推荐）
bash scripts/flutter-build-from-publish.sh <public_id>

# 手动指定能力集
CAPABILITY_KEYS=chat_qa,data_nl_query BUILD_PER_APP_ONLY=1 \
  APP_PUBLIC_ID=demo1 bash scripts/flutter-build-apk.sh
```

## 模块化机制

| 层 | 行为 |
|----|------|
| **菜单裁剪** | `app.dart` 按 `AppBranding.capabilityKeys` / manifest 过滤 Tab |
| **页面路由** | `capability_page_registry.dart` widget 类型 → 专属页（如 `NLQueryPage`） |
| **编译配置** | `tool/generate_modular_config.dart` 写入 `modular_capabilities.g.dart` |
| **体积优化** | per-app 构建启用 `--split-per-abi`（arm64 / armeabi-v7a 分包） |

## 验收

```bash
bash scripts/smoke-apk.sh http://101.32.209.251
# per-app 503/200 语义 + build-queue capability_keys 断言
```

## 后续（P3+）

- 更多 capability 专属 Flutter 页（非 ReportPage fallback）
- Flavor 白标 / Shorebird 热更新 / TPNS 推送
