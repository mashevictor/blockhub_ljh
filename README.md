# TrackChat PaaS 完整项目

## 架构

| 入口 | 端口 | 用户 | 说明 |
|------|------|------|------|
| **Home 主页** | 5173 | 普通用户 | 方案 A/B/C 创建应用（Web + App） |
| **Admin PaaS** | 5174 | 技术/管理员 | 高级开发模式 |
| **FastAPI** | 8001 | API | 后端服务 |
| **L5 Web Runtime** | 待定 | 员工 | React schema-renderer（Phase 1） |
| **L5 Flutter App** | 应用商店/内测 | 员工 | 同 Schema 的 App 端（Phase 2，生产必含） |

## 快速启动

```powershell
cd cozecode
.\start-all.ps1
```

- **Home 主页**：http://127.0.0.1:5173/（默认方案 A · 一句话生成）
- **高级开发模式**：http://127.0.0.1:5174/
- **API 文档**：http://127.0.0.1:8001/docs

## Home 主页三视图

1. **方案 A · 一句话生成**（主方案）— 输入描述 / 点选模块 → 生成 Web/App
2. **方案 B · 行业方案包** — 5 大行业 → 场景勾选 → B/C 受众 → 发布
3. **方案 C · 模块积木** — 36 Capability 组装 → 发布

## 目录

```
cozecode/
├── home/              ← 普通用户 Home 主页（Web + App 发布入口）
├── frontend/          ← 高级开发模式 Admin
├── backend/           ← FastAPI 后端
├── runtime-web/       ← L5 Web 员工端（待建）
├── runtime-app/       ← L5 Flutter App（待建）
├── designs/           ← HTML 设计稿（参考）
└── docs/
    ├── FLUTTER-APP-RUNTIME.md    ← Flutter App + 开源 UI 生态清单
    └── PRODUCTION-DEPLOYMENT.md  ← 生产部署清单（含腾讯云）
```

## 生产部署

详见 [docs/PRODUCTION-DEPLOYMENT.md](docs/PRODUCTION-DEPLOYMENT.md)
