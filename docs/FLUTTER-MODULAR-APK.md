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
# 列出全部 capability_key
bash scripts/flutter-build-custom.sh --list

# 自选能力打包（本地/运维）
bash scripts/flutter-build-custom.sh chat_qa,approval_flow \
  --name "门店助手" --color "#2563EB" --public-id abc12345

# 通用演示 APK
bash scripts/flutter-build-apk.sh

# 按发布队列构建 per-app APK（推荐，与 Home 发布一致）
bash scripts/flutter-build-from-publish.sh <public_id>

# 手动指定能力集
CAPABILITY_KEYS=chat_qa,data_nl_query BUILD_PER_APP_ONLY=1 \
  APP_PUBLIC_ID=demo1 bash scripts/flutter-build-apk.sh
```

## 能否自选模块？样式会不一样吗？

| 维度 | 行为 |
|------|------|
| **能力自选** | ✅ 可以。Home 发布时勾选的模块 → `capability_keys` → 自动写入 build-queue；也可用 `flutter-build-custom.sh` 手动指定 |
| **Tab / 页面** | 不同。选 `chat_qa+approval` 只有问答+审批两个 Tab；选 `shanghai_voice` 仅语音全屏壳 |
| **App 样式** | 整 App 统一：`PRIMARY_COLOR` 主题色、`APP_NAME` 名称、图标 —— **不是每个模块一套皮肤** |
| **特殊布局** | 仅 `shanghai_voice` 类能力会进入全屏语音 UI（与普通 Tab 壳不同） |

简单说：**模块决定「有什么功能、看到哪些 Tab」；品牌色/名称决定「整 App 长什么样」。**

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
