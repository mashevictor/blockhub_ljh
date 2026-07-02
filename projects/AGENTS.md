# TrackChat PaaS - 项目指南

## 项目概览

TrackChat 是一个企业级 PaaS 智能办公平台，基于五层架构模型：
- **L5 Runtime**: 员工端 Web/App、ChatWidget
- **L4 创建**: 7步向导、可行性报告、Page Schema JSON
- **L3 Catalog**: 65 办公场景 + 49 行业场景
- **L2 Capability**: 36 个原子能力
- **L1 Agent**: 7 套 Pipeline 服务
- **L0 Infra**: LLM 网关、RBAC、tenant_id 隔离

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **LLM**: coze-coding-dev-sdk (doubao-seed-2-0-mini)

## 目录结构

```
src/
├── app/
│   ├── api/                    # 后端 API 路由
│   │   ├── agents/             # Agent 管理
│   │   ├── applications/       # 应用管理（智能创建）
│   │   ├── approvals/          # 审批流程
│   │   ├── chat/               # 智能问答（LLM 流式）
│   │   ├── dashboard/          # Dashboard 数据
│   │   ├── knowledge/          # 知识库管理
│   │   ├── notifications/      # 消息通知
│   │   ├── scenarios/          # 场景目录
│   │   └── seed/               # 数据初始化
│   ├── agents/                 # Agent 中心页面
│   ├── approvals/              # 审批流程页面
│   ├── chat/                   # 智能问答页面
│   ├── create/                 # 智能创建向导
│   ├── knowledge/              # 知识库页面
│   ├── notifications/          # 消息通知页面
│   ├── reports/                # 数据报表页面
│   ├── scenarios/              # 场景目录页面
│   └── layout.tsx              # 根布局（含侧边栏）
├── components/
│   ├── sidebar.tsx             # 侧边栏导航
│   └── ui/                     # shadcn/ui 组件
├── lib/
│   └── utils.ts                # 工具函数
└── storage/
    └── database/
        ├── supabase-client.ts  # Supabase 客户端
        └── shared/
            └── schema.ts       # Drizzle Schema
```

## 核心功能

### 1. 7 PaaS Agent
| Agent | 功能 | Pipeline |
|-------|------|----------|
| 智能创建 | 元 Agent，编排场景创建与发布 | 需求→研判→澄清→Schema→编排→发布 |
| 智能问答 | RAG 驱动的多轮对话 | 接收→检索→Prompt→LLM→SSE→会话 |
| 知识库 | 文档切片与语义检索 | 上传→解析→切片→向量→索引→检索 |
| 审批流程 | 多级审批、会签、条件分支 | 提交→工作流→路由→状态→通知→归档 |
| 数据报表 | 图表看板、NL 查数 | 选指标→聚合→图表→NL查数→导出 |
| 消息通知 | 多渠道消息推送 | 触发器→规则→模板→发送→确认 |
| 外部数据 | ERP/OA/CRM 对接 | Discover→Extract→Map→Load→Sync→Serve |

### 2. 场景目录
- **办公场景**: 65 项（8 大类：人事行政、财务法务、知识协同、流程审批、数据报表、消息通知、IT与资产、外部对接）
- **行业场景**: 49 项（4 行业包：制造业 12、销售 12、医疗 12、游戏 13）

### 3. 智能创建向导
三维度选择：行业 → 场景 → 研判确认 → 生成 Schema

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 启动
pnpm start

# 类型检查
pnpm ts-check

# Lint
pnpm lint
```

## API 接口

| 路径 | 方法 | 功能 |
|------|------|------|
| /api/seed | POST | 初始化种子数据 |
| /api/agents | GET/POST | Agent 管理 |
| /api/scenarios | GET | 场景目录查询 |
| /api/applications | GET/POST | 应用管理 |
| /api/chat | GET/POST | 智能问答（SSE 流式） |
| /api/knowledge | GET/POST | 知识库管理 |
| /api/approvals | GET/PUT | 审批流程 |
| /api/notifications | GET/PUT | 消息通知 |
| /api/dashboard | GET | Dashboard 数据 |

## 数据库表

- `agents` - 7 个 Agent 定义
- `capabilities` - 34 个原子能力
- `scenarios` - 114 个场景（65 办公 + 49 行业）
- `applications` - 创建的应用
- `conversations` - 对话记录
- `messages` - 消息记录
- `knowledge_bases` - 知识库
- `documents` - 文档
- `approvals` - 审批记录
- `notifications` - 通知
