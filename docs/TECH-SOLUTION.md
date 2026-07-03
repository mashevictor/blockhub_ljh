# TrackChat PaaS 技术方案

> 参考文档：`功能/01-TrackChat-文档总目录与业务架构大纲.html`、`功能/14-TrackChat-技术架构选型.html`

## 1. 业务目标

TrackChat 是企业级 PaaS 智能办公平台：

- **7 PaaS Agent** 承载 **36 Capability**
- 驱动 **65 办公场景 + 49 行业场景 = 114 SKU**
- 经 **L4 智能创建** 生成 Page Schema，**L5 Runtime** 渲染交付

用户只感知 L3/L4/L5（中文场景名）；L1/L2 为后台编排与能力映射。

## 2. 五层架构映射

```
L5 Runtime     → runtime-web/ React schema-renderer + runtime-app/ Flutter App（同 page_schema）
L4 创建        → Home 三视图 + Admin /create + /creation/* ✅
L3 Catalog     → backend/app/data/seed.py + /catalog/* ✅ 已实现
L2 Capability  → /catalog/modules 36 项 ✅ 已实现
L1 Agent       → /agents/* 7 Pipeline ✅ 已实现
L0 Infra       → FastAPI + PG/Redis/COS/向量库（腾讯云生产）
```

**L5 双端交付：** Web 员工端（H5/PC）+ Flutter App 读取同一份 Page Schema JSON；通信 REST + SSE。  
详见 [FLUTTER-APP-RUNTIME.md](./FLUTTER-APP-RUNTIME.md)。

## 3. 前后端目录结构

```
cozecode/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── core/config.py       # 配置
│   │   ├── data/seed.py         # ★ 114 场景 + 36 Capability + 7 Agent
│   │   └── api/v1/
│   │       ├── catalog.py       # L3 Catalog API
│   │       ├── agents.py        # L1 Agent API
│   │       └── stats.py         # Dashboard 统计
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/AdminLayout.tsx   # 侧边栏 + 顶栏
│   │   ├── pages/
│   │   │   ├── OverviewPage.tsx         # 总览（仿 dev 站点）
│   │   │   ├── ScenarioCatalogPage.tsx  # ★ 114 场景目录
│   │   │   ├── AgentCenterPage.tsx
│   │   │   └── AgentDetailPage.tsx
│   │   └── api/client.ts
│   └── vite.config.ts           # 代理 /api → :8000
└── docs/TECH-SOLUTION.md
```

## 4. L3 Catalog 数据模型

### 办公场景 (65)

| 大类 | 数量 | 主责 Agent |
|------|------|-----------|
| 人事行政 | 12 | chat_qa+approval |
| 财务法务 | 9 | approval+kb+report |
| 知识协同 | 8 | kb+chat_qa |
| 流程审批 | 8 | approval+notify |
| 数据报表 | 8 | report |
| 消息通知 | 7 | notify |
| IT与资产 | 7 | integration+approval+kb |
| 外部对接 | 6 | integration |

### 行业方案包 (49)

| 方案包 | key | 场景数 |
|--------|-----|--------|
| 传统制造业 | mfg | 12 |
| 销售行业 | sales | 12 |
| 医疗行业 | med | 12 |
| 游戏行业 | game | 13 |

每条行业场景含：场景名、解决问题、预置页面、标准版标签(✓/部分/定制)、主责 Agent。

## 5. API 设计

遵循 REST + JSON，前缀 `/api/v1`：

| 模块 | 端点 | 说明 |
|------|------|------|
| Health | `GET /health` | 健康检查 |
| Stats | `GET /stats/dashboard` | 8 项 Dashboard 指标 |
| Stats | `GET /stats/activities` | 最近活动 |
| Stats | `GET /stats/trends` | 周趋势图数据 |
| Catalog | `GET /catalog/summary` | 114 统计摘要 |
| Catalog | `GET /catalog/office?category=&q=` | 办公场景（支持筛选） |
| Catalog | `GET /catalog/industry?pack=&q=` | 行业场景（支持筛选） |
| Catalog | `GET /catalog/industry/{pack}` | 单包详情 |
| Catalog | `GET /catalog/modules` | 36 Capability |
| Agents | `GET /agents` | 7 Agent 列表 |
| Agents | `GET /agents/{id}` | Agent + Capability 详情 |

## 6. 前端 UI 对照

| dev.coze.site 元素 | 本地实现 |
|-------------------|---------|
| 深色侧边栏 + 导航 | AdminLayout |
| Hero + 8 统计卡片 | OverviewPage stat-grid |
| 7 Agent 卡片 | OverviewPage + AgentCenterPage |
| 最近活动 | activities API |
| 本周趋势柱状图 | trends API + CSS bars |
| 五层架构模型 | architecture API |
| 快速入口 | quick-grid links |
| 场景目录 114 | ScenarioCatalogPage 全表展示 |

## 7. 广场 · Newsfeed（方案 B，已定稿）

| 模块 | 路由/表 | 状态 |
|------|---------|------|
| 广场页 UI | Home `/plaza` · 三栏（导航 / Feed / 热门） | ✅ Mock 壳 |
| @ 受众发布 | PublishModal 选 `@公开` / `@部门` / `@角色` | ⬜ W3 |
| Feed 数据 | `feed_posts` · `feed_reactions` · `feed_comments` | ⬜ W4 |
| API | `GET /plaza/feed` · `POST .../like` · `POST .../comment` | ⬜ W4 |
| 应用字段 | `apps.audience_type` · `apps.audience_targets` | ⬜ W3 |

设计稿：`designs/06-at-plaza-newsfeed.html`（方案 B 已定稿）

## 8. 后续迭代路线

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| Phase 1 ✅ | Catalog seed + Dashboard UI | P0 |
| Phase 2 | PostgreSQL 持久化 + JWT 认证 | P0 |
| Phase 3 | 智能创建 7 步向导 + Schema 生成 | P0 |
| Phase 4 | 7 Agent Pipeline 联调 + SSE 对话 | P1 |
| Phase 5 | runtime-web schema-renderer 36 Widget | P1 |
| Phase 6 | **runtime-app Flutter** + WidgetRegistry + 内测包 | P1 |
| Phase 7 | Milvus/向量检索 + COS 文档 | P2 |

## 9. 部署建议

- **开发**: `start.ps1` 本地双进程
- **生产**: Docker Compose（FastAPI + Nginx + PG + Redis）
- **Coze 部署**: 前端 build → 静态托管；后端 uvicorn → 5000 端口

与 `功能/14-TrackChat-技术架构选型.html` 拍板栈一致：React + FastAPI + REST/SSE + PG/Redis/Milvus。
