# CapShip — Capability → Ship

> **选型即交付引擎**：选定能力与壳模板，产出可运行的 Web + App 制品。  
> 与 LangChain / LangGraph / RAG **正交**——它们管「智能体如何思考」；CapShip 管「能力如何被建成产品」。

| | |
|---|---|
| 状态 | 设计草案（从积木仓 BlockHub 抽取） |
| 建议开源名 | **CapShip** |
| 许可建议 | Apache-2.0 |
| 文档版本 | 0.1.0 · 2026-07-14 |

## 文档索引

| 文档 | 内容 |
|------|------|
| **[capship.html](./capship.html)** | **★ 结构方案 SSOT**：技术框架、流程图、路径 A/B、双端约定、检查清单 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 深层分析、与 Lang\* / RAG 对比、解耦边界 |
| [SPEC.md](./SPEC.md) | 契约规范（schema / manifest / templates / packs） |
| [EXTRACTION.md](./EXTRACTION.md) | 从本仓库抽出开源包的步骤与白标清单 |
| [ROADMAP.md](./ROADMAP.md) | MVP → 1.0 开源路线图 |
| [capship-demo/README.md](./capship-demo/README.md) | 示范仓骨架（chat + approval） |
| [capship-scope-boundary.html](./capship-scope-boundary.html) | 开源范围与产品面边界（对外可见） |

开发时 Cursor Skill：`.cursor/skills/capship-capability/SKILL.md`（与 `capship.html` 同步遵循）。

## 30 秒理解

```text
capability_keys + web_template_id + app_ui_id
        │
        ▼
   CapShip Contract Engine
        │
        ├── page_schema      → Web / App 菜单与页面树
        └── build_manifest   → 要装哪些双端包
                │
                ├── runtime-web   （按 web_pkgs 懒加载）
                └── flutter APK   （按 flutter_pkgs 裁剪构建）
```

**LLM 不是必选。** 注册表内能力可纯确定性交付；未知能力才可选走「预览页 codegen」旁路。

## 它不是什么

- ❌ 不是又一个 Agent 框架（别和 LangGraph 抢车道）
- ❌ 不是向量检索框架（别和 LlamaIndex / 自建 RAG 混淆）
- ❌ 不是低代码拖拽画布（关注「能力包装配 + 多端壳」）

## 它是什么

- ✅ **Capability Registry**：能力 = 双端组件 + 路由约定
- ✅ **Delivery Contract**：选型结果编译为 schema / manifest
- ✅ **Shell Composition**：网页壳 × App UI 壳正交组合
- ✅ **Trimmed Runtimes**：只打包选中的能力，每应用可独立 `applicationId`

## 建议仓库形态（抽出后）

```text
capship/
  packages/
    contract/          # Python：registry, schema, manifest, templates
    web-core/          # TS：类型 + WidgetHost
    web-runtime/       # 最小 SPA
    flutter-core/      # Dart：CapabilityModule, branding
    flutter-runtime/   # shell + build scripts
    api-reference/     # 可选 FastAPI
  examples/
    chat-approval-demo/
  docs/
```

## 与积木仓的关系

积木仓（本 monorepo）= CapShip **核心** + 产品面（广场、B2B、上海话、预约、行业仓）。  
开源只抽核心；产品面继续闭源或另仓发布。

---

下一步：读 [ARCHITECTURE.md](./ARCHITECTURE.md)。
