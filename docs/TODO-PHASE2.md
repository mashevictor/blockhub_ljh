# 积木仓 BlockHub · Phase 2 待办清单

> 15 分钟快速版已落地项见下方「✅ 本版已完成」。其余按 P0→P1→P2 排期。

## ✅ 本版已完成（v0.1 最小闭环）

- [x] **三入口统一走 `/creation/publish`**：PromptView / IndustryView / ModuleView
- [x] **发布 payload 扩展**：`audience`、`deliver`、`source`、`prompt`、`scenario_names`
- [x] **后端内存库记录来源**：`create_app` 写入 audience/deliver/source/prompt
- [x] **Admin 总览展示已创建应用**：`GET /creation/apps` → OverviewPage「积木仓 · 已创建应用」
- [x] **发布成功弹窗**：增加「在管理后台查看已创建应用」链接

## P0 — 阻塞正式开发（1–2 周）

- [ ] **定品牌策略**：积木仓 vs TrackChat 域名/API/Admin 文案统一
- [ ] **ER 数据模型**：User、App、ScenarioSelection、PublishRecord、PageSchema
- [ ] **OpenAPI 契约冻结**：前后端以 Swagger 为唯一接口源
- [ ] **PostgreSQL 落库**：替换 `_created_apps` 内存列表
- [ ] **JWT 登录**：Home + Admin 共用 token

## P1 — 闭环验收（2–3 周）

- [ ] **PromptView 生成状态机**：pending / success / failed，可取消
- [ ] **runtime 预览页**：`/runtime/{id}` 最小 Schema 渲染（可先 JSON 预览）
- [ ] **积木仓扩展到 IndustryView / ModuleView**（或统一选配组件）
- [ ] **20 行业 ↔ 5 数据包**：产品定稿映射表 + API 文档
- [ ] **Admin 应用管理页**：编辑、下架、跳转 runtime
- [ ] **localStorage 迁移**：`trackchat-theme` → `blockhub-theme`

## P2 — 体验与债务

- [ ] **真实 LLM Mock 服务**：按行业/场景返回可变 Schema 片段
- [ ] **Catalog 后台可配置**：114 场景 CRUD，非 seed 硬编码
- [ ] **跨端 deliver 真正生效**：web/app/both 影响发布产物
- [ ] **桌面端第五周交付**：PublishModal 占位改真实计划
- [ ] **start-all.ps1 健康检查**：5173/5174/8001 一键启动 + 就绪探测

## 排期需你拍板（4 问）

1. Phase 2 验收 = 仅 PG+JWT，还是必须 **端到端可演示闭环**？
2. Admin 定位 = 员工工作台 or 平台运营后台 or 分角色？
3. LLM Mock = 固定 JSON or 可配置场景 Mock？
4. 品牌最终 = 全改 BlockHub or 双品牌并存？

## 本地验证本版

```powershell
# 终端1
cd backend; python -m uvicorn app.main:app --reload --port 8001

# 终端2
cd home; npm run dev

# 终端3
cd frontend; npm run dev -- --port 5174
```

1. Home → 描述需求 → 勾选场景 → 生成 → 弹窗出现 schema URL  
2. Admin 5174 总览 → 看到「积木仓 · 已创建应用」列表  
3. IndustryView / ModuleView 发布同样出现在列表
