# CapShip 架构深层分析

## 1. 问题定义：你们到底有什么能力？

积木仓当前最可产品化、也最适合开源的能力不是「又一个 Chatbot」，而是：

> **用户/ISV 选定一组能力（Capability）+ 一组交付壳（Web 模板 × App UI），系统确定性编译出页面契约与构建清单，并驱动 Web 运行时与 Flutter APK 裁剪构建。**

内部口头叫法「选型即交付」；开源包装名建议 **CapShip**（Capability → Ship）。

这条链路今天已经在仓内跑通：

```
PublishRequest(capability_keys, web_template_id, app_ui_id, deliver)
  → capability_resolver
  → schema_generator + build_manifest
  → persist AppRecord
  →（旁路）enqueue_apk_build / enqueue_codegen_job
  → GET /runtime/{id}/schema|manifest|download
  → runtime-web 渲染 · Flutter 装包
```

对应实现锚点（BlockHub monorepo）：

- 契约：`backend/app/data/delivery_templates.py`、`services/schema_generator.py`、`services/build_manifest.py`、`services/capability_resolver.py`
- API：`backend/app/api/v1/creation.py`（publish）、`runtime.py`
- Web：`packages/web-core`、`runtime-web`
- App：`packages/blockhub_flutter_core`、`runtime-app`、`scripts/flutter-build-from-publish.sh`
- 包名：`apk_build_profiles.android_app_id_for_public_id`

---

## 2. 能不能单独解耦？——结论：**能，而且应当**

### 2.1 热路径已经分层

| 层 | 内容 | 耦合产品？ |
|----|------|-----------|
| L0 产品面 | Home、广场、B2B、预约、行业站 | 强 · 不开源 |
| L1 发布编排 | HTTP、租户、落库、邮件 | 中 · 可精简参考实现 |
| **L2 契约引擎** | 模板 / resolver / schema / manifest | **弱 · 开源核心** |
| **L3 双端 Runtime** | Web WidgetHost · Flutter shell · 构建队列 | **弱 · 开源核心** |
| **L4 能力包** | `web-capability-*` · `capability_*` | **约定开源 · 示范包开源** |
| L5 AI 旁路 | flow-ask、未知 key codegen | 可选插件 |

主热路径 **不调用 LLM**：注册表内 key 走纯确定性编译。  
DeepSeek /「大模型」仅出现在：

- 编排工作台问答（`flow-ask`）
- 未知能力异步预览页（`codegen_*` → `generated_page`）
- 选型推荐等产品功能

切除 L5，已注册能力的「publish → 双端」**仍然成立**。

### 2.2 解耦后剩下什么「能力产品」？

可包装为独立框架能力陈述：

1. **Capability Registry** — 能力是一等公民（不是页面配置碎片）
2. **Contract Compiler** — keys + 壳 → `page_schema` + `build_manifest`
3. **Shell Matrix** — Web 布局壳 × App 导航壳正交组合
4. **Trimmed Multi-runtime** — 按 manifest 懒加载 / 裁剪依赖
5. **Per-app identity** — 每应用独立 `applicationId` 与制品路径

这五样合在一起，就是一个不同于 Agent 框架的新品类：  
**Capability Delivery / Runtime Assembly Framework**。

### 2.3 暂时不应塞进开源核心的东西

- 广场 likes/feed、预约演示与邮件投递、B2B 官网运营页  
- 上海话实时语音演示（可作为 **社区能力包示例** 另仓）  
- 行业 114 SKU 目录与租户审批自定义能力  
- 「看似 codegen 其实只吐 JSON 预览」被宣传成「自动写出完整 monorepo」——当前能力边界必须写清楚

---

## 3. 与 LangChain / LangGraph / RAG 的深层差异

### 3.1 三者解决的问题完全不同

| | LangChain | LangGraph | RAG | **CapShip** |
|---|-----------|-----------|-----|-------------|
| 核心问题 | 链式调用 LLM/工具 | 有状态 Agent 图编排 | 检索增强生成 | **能力选型 → 可分发制品** |
| 抽象单位 | Chain / Tool | Node / Edge / State | Document / Retriever | **Capability Pack** |
| 输出 | 对话/工具副作用 | 执行轨迹 / 状态 | 带出处的答案 | **Schema + Manifest + Web/APK** |
| 确定性 | 低（模型主导） | 中低（图+模型） | 中（检索可评估） | **高（注册表内无模型）** |
| 面向角色 | AI 工程师 | AI 工程师 | AI/搜索工程师 | **产品/交付/多端工程师** |

### 3.2 正交而不是替代

它们可以 **同时存在于一个产品**，但职责绝不重叠：

```text
┌─────────────────────────────────────────────────┐
│ 产品工作台（广场编排、问答助手）                   │
│   └─ 可用 LangGraph / 自研 Agent / flow-ask       │
├─────────────────────────────────────────────────┤
│ 知识能力包（kb）内部                              │
│   └─ 可用 RAG / 向量库（能力包私有实现）            │
├─────────────────────────────────────────────────┤
│ CapShip 交付引擎                                   │
│   └─ 不管「怎么思考」，只管「装哪些包、什么壳」     │
└─────────────────────────────────────────────────┘
```

常见误区：

- ❌ 把 CapShip 说成「我们的 LangChain」——会在开源社区立刻撞车且说不清价值  
- ❌ 把 RAG 说成交付引擎——检索不等于组壳与出包  
- ✅ 对外叙事：**Agent 负责决策；CapShip 负责落地成 App**

### 3.3 和邻近品类的边界

| 品类 | 代表 | 与 CapShip |
|------|------|------------|
| 低代码/拖拽 | Appsmith、内部搭建器 | CapShip 是 **能力组合** 非像素级画布 |
| 跨端 UI | Flutter / React Native 自身 | CapShip 在之上加 **注册表裁剪与契约** |
| 微前端模块联邦 | Module Federation | 理念接近，但 CapShip 强调 **双端同契约 + 构建期裁剪** |
| AI 生成整站 | v0、GPT Engineer | CapShip 默认 **组件预置**；AI 只填未知洞 |

---

## 4. 推荐开源架构

```text
                    ┌──────────────┐
   Host App / CLI → │ CapShip API  │  （可选参考实现）
                    └──────┬───────┘
                           │ PublishIntent
                    ┌──────▼───────┐
                    │   Contract   │  registry · templates · schema · manifest
                    └──────┬───────┘
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌────────────┐            ┌────────────┐
       │ Web Runtime│            │ App Runtime│
       │ + web packs│            │ + flutter  │
       └────────────┘            │   packs    │
                                 └────────────┘
Optional: AI Codegen Adapter（任意 LLM → generated_page 合并）
```

### 包划分

| 包名 | 语言 | MVP |
|------|------|-----|
| `@capship/contract` | Python（也可后续 TS 镜像类型） | 必须 |
| `@capship/web-core` + `@capship/web-runtime` | TypeScript | 必须 |
| `@capship/flutter_core` + runtime shell | Dart | 必须 |
| `@capship/api` | FastAPI | 可选 |
| `@capship/ai-codegen` | Python | 可选 |

---

## 5. 开源竞争力（为何值得开）

1. **品类空白**：Agent 框架过多；「能力→双端制品」少有清晰 OSS。  
2. **可演示**：选 3 个 key → 一分钟出 Web，数分钟出 APK（环境具备时）。  
3. **与 LLM 浪潮互补**：模型越强，越需要可靠的「落地层」。  
4. **扩展模型清晰**：第三方只交 Capability Pack，不必 fork 引擎。  

风险：

- Flutter 构建环境重 → 文档必须提供 GitHub Actions / Docker Runner 方案  
- 若不守住「确定性优先」叙事，会被当成又一个 AI toy 站  

---

## 6. 总结判断

| 问题 | 答案 |
|------|------|
| 能否单独解耦？ | **能**，抽 L2–L4 |
| 是否区别于 LangChain/LangGraph/RAG？ | **本质不同问题域，正交可组合** |
| 能否包装开源框架？ | **能**，建议品牌 **CapShip** |
| 现在就能宣称「AI 写完整 App」吗？ | **不能**；应宣称「选型编译交付 + 可选 AI 预览未知能力」 |

下一篇：[SPEC.md](./SPEC.md)（契约细节）。
