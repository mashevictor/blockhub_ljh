# CapShip 契约规范（Draft 0.1）

本文描述开源核心必须稳定的机器可读契约。字段名与当前积木仓实现对齐，便于渐进抽取。

## 1. PublishIntent（输入）

```jsonc
{
  "name": "演示应用",
  "capability_keys": ["chat_qa", "approval_flow"],
  "web_template_id": "tabs_portal",   // tabs_portal | sidebar_admin | landing_single
  "app_ui_id": "bottom_tabs",         // bottom_tabs | drawer_nav | immersive_chat
  "deliver": "both",                  // web | app | both
  "primary_color": "#4338ca",
  "icon_url": ""
}
```

规则：

- **显式 `capability_keys` 优先**；不得静默用场景推荐覆盖用户选型（产品侧已按此约束）。
- 未知 key → `dropped_keys` / `pending_codegen_keys`；不阻断已解析 key 的交付。

## 2. Capability Descriptor（注册表条目）

```jsonc
{
  "key": "chat_qa",
  "name": "智能问答",
  "widget": "ChatWidget",           // Web 组件名
  "web_pkg": "@capship/web-capability-chat",  // 可空 → 约定推导
  "flutter_pkg": "capability_chat_qa",        // 可空 → capability_{key}
  "route": "/chat-qa",                        // 可空 → /{slug}
  "category": "对话"
}
```

约定推导（注册表留空时）：

| 字段 | 约定 |
|------|------|
| `web_pkg` | `@capship/web-capability-{slug}`（slug = key 下划线改连字符） |
| `flutter_pkg` 物理目录 | `capability_{key}` |
| `route` | `/{slug}` |

## 3. page_schema（页面契约）

运行时用以挂菜单与组件树（精简示意）：

```jsonc
{
  "version": 1,
  "appId": "a1b2c3d4",
  "title": "演示应用",
  "theme": {
    "primaryColor": "#4338ca",
    "templateId": "tabs_portal"
  },
  "capability_keys": ["chat_qa", "approval_flow"],
  "menu": [
    { "label": "智能问答", "route": "/chat-qa", "capability_key": "chat_qa" }
  ],
  "root": {
    "layout": "tabs",
    "children": [
      {
        "type": "widget",
        "widget": "ChatWidget",
        "route": "/chat-qa",
        "capability_key": "chat_qa"
      }
    ]
  }
}
```

可选节点：`type: "generated_page"` — AI 预览页，由旁路合并，**不是**正式能力包。

## 4. build_manifest（构建契约）

```jsonc
{
  "version": 1,
  "capability_keys": ["chat_qa", "approval_flow"],
  "widgets": ["ChatWidget", "ApprovalWidget"],
  "routes": ["/chat-qa", "/approval"],
  "web_pkgs": [
    "@capship/web-capability-chat",
    "@capship/web-capability-approval"
  ],
  "flutter_pkgs": ["capability_chat_qa", "capability_approval_flow"],
  "deliver": "both",
  "meta": {
    "web_template_id": "tabs_portal",
    "app_ui_id": "bottom_tabs"
  }
}
```

消费者：

- **Web**：按 `web_pkgs` 动态 `import` / 注册 widget  
- **Flutter**：sync pubspec + codegen registry，仅链接列出的包  

## 5. Shell 模板矩阵

### Web（`web_template_id`）

| id | 布局语义 |
|----|----------|
| `tabs_portal` | 多页签门户 |
| `sidebar_admin` | 侧栏后台 |
| `landing_single` | 单页落地 |

### App（`app_ui_id`）

| id | 导航语义 |
|----|----------|
| `bottom_tabs` | 底部 Tab |
| `drawer_nav` | 抽屉导航 |
| `immersive_chat` | 沉浸对话（语音类能力推荐） |

壳与能力正交：同一组 keys 可换壳，不必改能力包。

## 6. 应用身份

| 字段 | 规则 |
|------|------|
| `public_id` | 宿主生成的短 id |
| `android_app_id` | `com.<vendor>.app.{slug(public_id)}`；slug 清洗；首字符为数字则前缀 `a` |
| 制品路径 | `uploads/apks/{public_id}.apk`（参考实现） |

重建指纹建议包含：`android_app_id`、`capability_keys`、`app_ui_id`、`app_name`、`primary_color` 等；变更则失效旧 APK。

## 7. Capability Pack 接口（概念）

### Web

```ts
// packages/web-capability-chat/src/index.ts
import { registerWidget } from '@capship/web-core'
import { ChatWidget } from './ChatWidget'
registerWidget('ChatWidget', ChatWidget)
```

### Flutter

```dart
// 实现 CapabilityModule：提供路由页面 / 导航项
abstract class CapabilityModule {
  String get key;
  // ... route builder, menu contribution
}
```

## 8. AI Codegen 旁路（可选，非核心）

```text
unknown_keys → LLM → generated page JSON → merge into page_schema
```

约束（写进 README 防止期待错位）：

1. 默认生成 **schema 预览页**，不是完整 TypeScript/Dart 能力包  
2. 不得阻塞已解析能力的 Web/APK 交付  
3. Adapter 可插拔（OpenAI / DeepSeek / 本地模型）

## 9. 兼容性承诺（开源后）

| 版本策略 | 说明 |
|----------|------|
| `page_schema.version` / `build_manifest.version` | 破坏性变更必须升 major |
| 新增壳 id | 向后兼容 |
| 删除注册表字段 | 需弃用周期 |

---

实现对照（BlockHub）：

- `backend/app/services/build_manifest.py`
- `backend/app/data/delivery_templates.py`
- `backend/app/services/schema_generator.py`
- `backend/app/services/apk_build_profiles.py`
