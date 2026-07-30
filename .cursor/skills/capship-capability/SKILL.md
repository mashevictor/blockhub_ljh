---
name: capship-capability
description: >-
  CapShip 选型即交付：按统一 Capability 契约实现/改造 Web+App 能力包。
  当用户新增或修改能力、模块、Agent、widget、capability_*、web-capability-*、
  capability_registry、page_schema、build_manifest、codegen 未知能力、
  APP_UI_ID、web_template_id、双端裁剪、flutter-parity、选型即交付时使用本 skill。
---

# CapShip Capability 开发流程

## 必读 SSOT

动手前打开并遵守：

`docs/opensource/capship.html`

冲突时以该 HTML 为准。补充读：`docs/opensource/SPEC.md`、`ARCHITECTURE.md`。

## 核心法则（先对齐）

1. **一切可交付功能 = Capability**（旧称模块 / Agent / Flutter 工具都归此）
2. **热路径无 LLM**：`capability_keys` → resolver → `page_schema` + `build_manifest` → Web / APK
3. **Web ⟂ App 对称**：同一 manifest；Web 只吃 `web_pkgs`，App 只吃 `flutter_pkgs` + `APP_UI_ID`
4. **未知能力走路径 B（预览）→ 转正必须路径 A（正式包）**；禁止夸大 codegen

## 开工前判定

| 情况 | 路径 | 动作 |
|------|------|------|
| 注册表已有 key，补齐/修复实现 | **A** | 按下节「路径 A」 |
| 全新业务能力，要进生产 | **A** | 注册 + 双端包 |
| 用户提到的能力不在注册表，先应付交付 | **B→A** | codegen 预览 + 已知 keys 照常发布；安排转正 |
| 只改壳（Tabs/侧栏/沉浸） | 壳 | 只动 `delivery_templates` / schema theme / APP_UI_ID，不动能力包 |
| LangChain/LangGraph/RAG | 包内 | 写在能力包内部，不进 publish 热路径 |

## 路径 A — 正式 Capability（默认）

严格按顺序，勿跳步：

### A1 定契约

- `key`：稳定、小写+下划线（如 `inventory_scan`）
- `name` / `category` / `widget` / `agent_id`（agent_id 仅元数据分组）
- 能约定推导则 **勿** 硬填 `web_pkg`/`route`（见 registry 注释）

### A2 写注册表

编辑：`backend/app/data/capability_registry.py`（`CapabilityDef`）

**i18n（强制）**：
- `name` 为 zh-CN 默认文案
- 英文优先写 `labels=(("en-US", "..."),)`，或补 `shared/i18n/seed/capability.en-US.json`
- 改完跑 `python scripts/codegen-i18n-messages.py`（生成 `capability.gen.json`）

### A3 Web 包

- 目录：`packages/web-capability-{slug}/`（或复用已有共享包并设 `web_pkg`）
- 副作用：`registerWidget('XxxWidget', Component)`
- 由 `runtime-web` + `manifest.web_pkgs` 懒加载；**禁止**在 `home/` 硬编码该能力特例

**i18n（强制）**：
- 必须有 `src/locales/{zh-CN,en-US}.json` + `src/locales/index.ts`（`contributeI18nMessages`）
- `src/index.ts` 必须 `import './locales'`
- UI 文案用 `useTf('cap.{key}.*', '中文兜底')`；**只允许**本包 owned keys（`cap.{key}.*`），CI：`python scripts/check_i18n_namespace.py`
- 新建包可先跑：`python scripts/scaffold-capability-locales.py`

### A4 App 包

- 目录：`packages/capability_{key}/`
- 实现 `CapabilityModule`（或项目既有等价接口）
- 更新 `shared/flutter-parity-matrix.json`
- 确认 `scripts/flutter-sync-pubspec-from-manifest.py` / 构建链能裁进该包
- 若确需仅 Web：在注册/文档标明，并在 HTML 检查清单注释原因

**i18n（强制 · 同源）**：
- **禁止** App 单独维护一套英文；文案 SSOT 在 `shared/i18n` + 对应 `web-capability-*/src/locales`
- 跑 `python scripts/codegen-flutter-arb.py` → `BhL10n` assets + `shared/i18n/flutter/*.arb`
- 页面用 `bhTf('cap.{key}.*', '中文兜底')`（与 Web 同一 key）

### A5 壳与身份（勿与能力逻辑耦合）

- Web 壳：`web_template_id` ∈ `tabs_portal` | `sidebar_admin` | `landing_single`
- App 壳：`app_ui_id` ∈ `bottom_tabs` | `drawer_nav` | `immersive_chat`
- 包名：`android_app_id` = `com.blockhub.app.{slug(public_id)}`（见 `apk_build_profiles`）

### A6 业务落地（路径 A 生产包强制）

能力包 UI **禁止** localStorage / 内存假数据冒充业务。须有：

- Backend：`models` 表 + alembic 迁移 + `/api/v1/...`（鉴权、租户隔离；参考 `approvals` / `device_repair`）
- Web：`apiFetch` + `useRuntime().token` / `appId`
- App：`getRuntimeAuthedDio()` + `branding.apiBaseUrl`；跨端隔离用 `appPublicId`（勿用 Android `applicationId`）
- 空库可空列表；**不要** seed 演示假工单伪装成已有数据

### A6.1 Runtime 填表交互（强制，对齐首页「预约演示」）

**适用范围**：所有 Runtime 业务写入表单（弹幕能力、审批 `FormWidget`、IM Webhook 绑定等）。**禁止**一屏堆满多个 `<input>` / 传统多列表单。

统一：

1. 使用 `@blockhub/web-core` 的 **`GtgtStepComposer`**（样式类 `bh-gtgt-*`，runtime-web `styles.css` 已提供）
2. 交互与 `BookingFloatingAgent` 同构：**单字段聚焦** → 前缀 `>> 字段名` → Enter /「确认」推进 → 最后一步提交真 API
3. 可选步骤可「跳过」；选择类字段用 `GtgtStep.render`（如合格/不合格、IM 通道卡片）
4. 提交成功后递增 `resetKey` 归零步进；列表、派工、批复、测推送等 **读操作 / 二次动作** 可留在表单下方
5. 参考：`DemoBookingContext` + `BookingFloatingAgent`；实现示例：`device_repair` / `member_loyalty` / `quality_inspect` / `approval` / `notify_im`
6. **Flutter App** 同源：`blockhub_flutter_core` 的 **`GtgtStepComposer`**（`>> 字段名` 单字段确认推进），弹幕能力页禁止多框同屏

**反例**：`bh-flow-body` 里同时露产品号+工序+备注多个 input；或旧分步只换页但仍用无 `>>` 的普通 input（须改成 `GtgtStepComposer`）。

**已覆盖能力包（写入主路径 · Web + App）**：`device_repair`、`quality_inspect`、`inventory_count`、`member_loyalty`、`med_triage`、`nurse_shift`、`game_support`、`school_notice`、`homework_qa`、`property_repair`、`site_patrol`、`class_schedule`、`hotel_booking`；另 Web：`approval`（FormWidget）、`notify_im`（Webhook 绑定）。

### A7 验收

- [ ] 仅勾选该 key publish → `page_schema.menu/routes` 含该项
- [ ] Web / App 读写同一真 API，刷新后数据仍在
- [ ] deliver 含 app 时构建 log / manifest 含 `flutter_pkgs`
- [ ] 无场景推荐「偷加」未选 key
- [ ] 未把 LLM 塞进 resolver/schema 热路径
- [ ] 业务填单为 `>>` 单字段步进（非多框同屏表单）
- [ ] registry 有 en labels / seed；Web `locales/` + `import './locales'`；App 用 `bhTf` 同源 key
- [ ] `python scripts/check_i18n_namespace.py` 通过（无串包 key）

## 路径 B — 暂时没有的能力

1. Resolver 产出 `dropped_keys` / `pending_codegen_keys`
2. **已知 keys 照常**生成 schema/manifest 并交付 Web/App
3. 异步 `codegen_*` → `generated_page` 合并进 schema
4. Web 用 `GeneratedPageWidget` 展示预览
5. 文案只能说「预览/生成中」，**禁止**「已生成完整能力包」
6. 要转生产 → 立刻开路径 A（注册表 + 双端包）；预览页可删或保留为说明

## 改造「旧模块 / 旧 Agent」

把散落实现收拢时：

1. 先找是否已有 `CapabilityDef`；没有则补注册
2. Web 逻辑迁入 `web-capability-*`；App 迁入 `capability_*`
3. 删除 `runtime-web` / `home` 内对该业务的硬编码分支
4. Agent 编排、RAG、语音 WS 等保留在包内，注册表只露 key

## 明确不要做

- 只做 Demo 按钮不上注册表
- 只做一端却宣称五端/双端交付
- 用场景模板覆盖用户显式 `capability_keys`
- 把广场/B2B/预约写进能力核心包
- 新增「第二套」schema 生成逻辑（契约唯一：schema_generator + build_manifest）

## 提交说明建议

```
feat(capability): add {key} web+app packs via CapShip path A
```

或

```
feat(capability): wire {key} codegen preview (path B); known keys unaffected
```

## 参考文件锚点

| 用途 | 路径 |
|------|------|
| 注册表 | `backend/app/data/capability_registry.py` |
| 壳 | `backend/app/data/delivery_templates.py` |
| Resolver | `backend/app/services/capability_resolver.py` |
| Schema / Manifest | `schema_generator.py` / `build_manifest.py` |
| APK | `apk_builder.py` / `apk_build_profiles.py` |
| Codegen B | `codegen_jobs.py` / `codegen_deepseek.py` |
| Web 核 | `packages/web-core` / `runtime-web` |
| App 核 | `packages/blockhub_flutter_core` / `runtime-app` |
