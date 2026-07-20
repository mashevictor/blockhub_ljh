# 从积木仓抽取 CapShip 的步骤

目标：不炸坏现有产品面的前提下，把 L2–L4 抽成可独立发布的开源仓。

## 阶段 0 — 定边界（本周可完成）

- [x] 写下开源叙事与差异化（见 ARCHITECTURE.md）
- [x] 冻结契约草案（见 SPEC.md）
- [x] 选定 vendor 前缀（可配置）：默认 `com.blockhub` / `@blockhub/web-capability`；开源设 `CAPSHIP_ANDROID_VENDOR=com.capship` · `CAPSHIP_WEB_PKG_PREFIX=@capship/web-capability` · `CAPSHIP_PUB_PREFIX=capship_`（见 `packages/capship-contract`）
- [ ] 许可证 Apache-2.0 + CLA / DCO 决策

## 阶段 1 — 契约库（最先可独立测试）

**已落地骨架**：`packages/capship-contract`（`capship_contract`）

| 模块 | 状态 |
|------|------|
| `vendor.py` 白标前缀 | ✅ |
| `registry_core.py` 示范子集 chat_qa / approval_flow | ✅ |
| `manifest.py` / `schema_minimal.py` | ✅ |
| `android_id.py` | ✅；BlockHub `apk_build_profiles` 已委托 |
| `build_manifest.WEB_PKG_PREFIX` | ✅ 读 contract vendor |
| 全量 registry / resolver / delivery_templates 迁入 | ⬜ 下一迭代（backend 仍为产品全集 SSOT） |

验收：

```bash
python3 packages/capship-contract/tests/run_smoke.py
# 或
cd packages/capship-contract && python3 tests/run_smoke.py
```

```text
keys=[chat_qa, approval_flow]
 → page_schema 含 2 路由
 → manifest.web_pkgs / flutter_pkgs 非空
 → android_app_id 对 digit-leading id 合规 + vendor env
```

## 阶段 1.5 — Composer（L2–L4 编排面，已在 monorepo 落地）

| 源 | 目标包 |
|----|--------|
| `packages/capship-composer/**` | `@capship/composer` |
| 三模式：`live_edit` / `module_flow` / `select_modules` | 对话改页（默认）· 数据流 · 选模块 |
| 悬浮壳对齐 home `FloatingAgentDock` capsule | 握把 + `>>` + caret 折叠/展开（无文字链） |
| Runtime `PATCH /runtime/{id}/schema|modules` | 写回 `apps.page_schema` / capabilities |
| 行业场景 SSOT `scene_capability_map.py` | 场景清单 → menu_plan + capability_keys |

产品面消费（注意边界）：

- **`/capship` 产品页保持开源营销/GitHub 介绍，不做工作台改造**；Composer UI 随开源仓发布，不绑在本页
- Home CreateStudio / PromptView / ModuleView 对齐 Composer 模式契约（`data-capship-mode`）
- `runtime-web` 懒加载 `>>` dock，保存后即时刷新 WidgetHost

## 阶段 2 — Web Runtime

| 源 | 目标 |
|----|------|
| `packages/web-core/**` | `@capship/web-core` |
| `runtime-web/**`（去掉产品 hardcode） | `@capship/web-runtime` |
| `web-capability-chat`、`approval`、`dashboard` | 示范能力包 |
| `@capship/composer`（runtime dock） | 与 web-runtime 同仓或 peer |

验收：静态 fixture schema/manifest → `pnpm dev` 可渲染，无后端。

## 阶段 3 — Flutter Runtime

| 源 | 目标 |
|----|------|
| `packages/blockhub_flutter_core/**` | `capship_flutter_core` |
| `runtime-app` 壳路由 / branding | `capship_runtime_app` |
| `scripts/flutter-sync-pubspec-from-manifest.py` | `tools/sync_pubspec.py` |
| `scripts/flutter-build-from-publish.sh` | `tools/build_apk.sh` |
| `shared/flutter-parity-matrix.json` | `parity-matrix.json` |

验收：本地 `CAPABILITY_KEYS=chat_qa APP_UI_ID=bottom_tabs` 可 assemble（不强制 CI 出 APK）。

## 阶段 4 — 参考 API（可选）

精简 `POST /v1/publish` + `GET /v1/apps/{id}/schema|manifest|download`：

- 去掉 plaza / email / booking / contact gate  
- SQLite 或文件后端即可  
- APK 队列做成可选 Worker  

## 阶段 5 — AI 适配器（可选）

| 源 | 目标 |
|----|------|
| `codegen_jobs.py` + `codegen_deepseek.py` | `@capship/ai-codegen` + `LlmProvider` 接口 |

**禁止**在开源首页写「一键生成完整 Flutter 工程」——除非实现达到该水位。

## 白标清单（必须改）

- [ ] 包名 `com.blockhub.*` → 可配置 vendor  
- [ ] npm `@blockhub/` → `@capship/`  
- [ ] 默认文案 / DeepSeek prompt 去品牌  
- [ ] 去掉 shanghai_voice 推荐耦合（改为 profile plugin）  
- [ ] 文档与示例不含客户数据  

## 产品仓适配方式

```text
BlockHub (closed/product)
  ├── depends on CapShip packages
  ├── L0 home / plaza / booking / industry
  └── capability_shanghai_voice (product or separate OSS example)
```

抽取期间保持 **契约单一来源**：产品仓不再内嵌第二套 schema 生成逻辑。

## 建议开源仓名

| 选项 | 说明 |
|------|------|
| `capship` | 推荐：短、好记、叙事清晰 |
| `blockhub-delivery` | 与产品强绑定，适合官方 org 镜像 |
| `select-deliver` | 直译选型交付，国际认知稍弱 |

GitHub org 建议：`capship-hq/capship` 或挂在 `mashevictor/capship`。
