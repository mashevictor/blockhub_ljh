# TrackChat 生产环境部署清单

> 面向 `cozecode/` 完整项目：Home 主页 (5173) + Admin PaaS (5174) + FastAPI 后端 (8001)

---

## 一、你需要准备的基础设施

### 1. 服务器（推荐配置）

| 环境 | CPU | 内存 | 磁盘 | 数量 |
|------|-----|------|------|------|
| MVP 单机 | 4 核 | 8 GB | 100 GB SSD | 1 台 |
| 生产标准 | 8 核 | 16 GB | 200 GB SSD | 2 台（应用+DB 分离更佳） |

操作系统：**Ubuntu 22.04 LTS** 或 CentOS Stream 9

### 2. 域名与证书（必须）

- [ ] 注册域名，例如 `trackchat.com`
- [ ] 规划子域名：
  - `app.trackchat.com` → **Home 主页**（普通用户创建入口）
  - `admin.trackchat.com` → **高级开发模式**（PaaS 管理端）
  - `api.trackchat.com` → **FastAPI 后端**
  - `*.trackchat.com` 或 `r.trackchat.com` → **Runtime 生成的应用**
- [ ] 申请 SSL 证书（Let's Encrypt 免费 / 云厂商证书）

### 3. 数据库与中间件（生产必须，当前 Demo 为内存）

| 组件 | 用途 | 版本建议 |
|------|------|----------|
| **PostgreSQL** | 114 场景、应用、审批、对话 | 15+ |
| **Redis** | 会话、缓存、限流 | 7+ |
| **MinIO / OSS** | 知识库文档存储 | — |
| **Milvus / PGVector** | 向量检索（RAG） | Phase 2 |

---

## 二、你需要完成的代码/配置工作

### 阶段 1：上线最小可用（1~2 周）

- [ ] **PostgreSQL 建表**：参考 `projects/src/storage/database/shared/schema.ts` 迁移到 FastAPI + SQLAlchemy
- [ ] **Seed 数据入库**：114 场景 + 7 Agent + 36 Capability（一次性 `POST /api/v1/seed`）
- [ ] **替换内存存储**：chat / approvals / notifications / applications 改持久化
- [ ] **环境变量**（见下方 `.env` 模板）
- [ ] **CORS 白名单**：只允许 `app.` 和 `admin.` 域名
- [ ] **Home 环境变量**：`VITE_ADMIN_URL=https://admin.trackchat.com`
- [ ] **Admin 环境变量**：API 指向 `https://api.trackchat.com`

### 阶段 2：核心能力（2~4 周）

- [ ] **LLM 网关**：接入 OpenAI / 通义 / 豆包，替换 Mock 问答
- [ ] **JWT + RBAC**：管理员登录、租户隔离 `tenant_id`
- [ ] **Runtime 子域**：`/r/{appId}` 读取 `page_schema` 渲染员工端
- [ ] **文件上传**：知识库 PDF/Word → MinIO
- [ ] **SSE 流式对话**：生产 Nginx 需关闭缓冲

### 阶段 3：Flutter App 与规模化

- [ ] 新建 `runtime-app/`（Melos + flutter_modular + go_router + Riverpod）
- [ ] Flutter 壳拉取 `GET /runtime/{appId}/schema` + `GET /tenant/config`
- [ ] UI 基座选型：**TDesign Flutter** 或 **Bruno**（见 [FLUTTER-APP-RUNTIME.md](./FLUTTER-APP-RUNTIME.md) 开源 UI 清单）
- [ ] 图表 Capability 接 **fl_chart**；对话接 **REST + SSE**（与 Web 一致）
- [ ] Android 内测包 → **COS + CDN**；推送 → **腾讯 TPNS**
- [ ] 可选：Shorebird 热补丁、flutter_flavorizr 白标多包
- [ ] Docker Compose / K8s 编排
- [ ] 监控：Prometheus + Grafana / 云监控
- [ ] 日志：ELK 或 Loki
- [ ] 备份：PG 每日自动备份

---

## 三、环境变量模板

### 后端 `backend/.env`

```env
APP_NAME=TrackChat PaaS API
API_PREFIX=/api/v1
CORS_ORIGINS=https://app.trackchat.com,https://admin.trackchat.com

DATABASE_URL=postgresql+asyncpg://trackchat:密码@localhost:5432/trackchat
REDIS_URL=redis://localhost:6379/0

JWT_SECRET=请替换为32位以上随机字符串
JWT_EXPIRE_MINUTES=1440

LLM_PROVIDER=openai
LLM_API_KEY=sk-xxx
LLM_MODEL=gpt-4o-mini

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=xxx
MINIO_SECRET_KEY=xxx
MINIO_BUCKET=trackchat-docs
```

### Home 主页 `home/.env.production`

```env
VITE_ADMIN_URL=https://admin.trackchat.com
VITE_API_BASE=https://api.trackchat.com/api/v1
```

### Admin 管理端 `frontend/.env.production`

```env
VITE_API_BASE=https://api.trackchat.com
```

---

## 四、构建与部署命令

### 本地构建验证

```powershell
# 后端
cd cozecode\backend
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8001

# Home 主页
cd cozecode\home
npm install && npm run build
# 产物在 home/dist/

# Admin 管理端
cd cozecode\frontend
npm install && npm run build
# 产物在 frontend/dist/
```

### 服务器部署（Nginx 反代示例）

```nginx
# app.trackchat.com → Home 静态站
server {
    listen 443 ssl;
    server_name app.trackchat.com;
    root /var/www/trackchat/home/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api/ { proxy_pass http://127.0.0.1:8001; }
}

# admin.trackchat.com → Admin 静态站
server {
    listen 443 ssl;
    server_name admin.trackchat.com;
    root /var/www/trackchat/admin/dist;
    location / { try_files $uri $uri/ /index.html; }
    location /api/ { proxy_pass http://127.0.0.1:8001; }
}

# api.trackchat.com → FastAPI
server {
    listen 443 ssl;
    server_name api.trackchat.com;
    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        # SSE 必须
        proxy_buffering off;
        proxy_cache off;
    }
}
```

### Docker Compose（推荐）

你需要准备：

- [ ] 编写 `docker-compose.yml`（backend + postgres + redis + nginx）
- [ ] 编写 `backend/Dockerfile`
- [ ] 编写 `nginx.conf`
- [ ] CI/CD：GitHub Actions 或 Jenkins 自动 build → 推镜像 → 服务器 pull

---

## 五、上线前检查清单（Checklist）

### 安全

- [ ] 修改所有默认密码和 JWT_SECRET
- [ ] HTTPS 全站强制
- [ ] API 限流（Redis）
- [ ] 上传文件类型与大小限制
- [ ] 敏感词 / 脱敏（医疗、游戏 C 端）

### 功能

- [ ] Home 三视图（A/B/C）发布流程打通真实 API
- [ ] 114 场景 Catalog 从 DB 读取
- [ ] 高级开发模式 admin 与 home 域名分离可访问
- [ ] 创建的应用有唯一 `publish_url` 可访问

### 运维

- [ ] 健康检查 `/api/v1/health` 接入监控
- [ ] 数据库备份策略
- [ ] 回滚方案（保留上一版 dist 镜像）
- [ ] 错误告警（5xx 邮件/企微）

---

## 九、GA 验收（2026-07 · 124.222.177.43 已验）

> 单机 IP 部署已跑通以下项；域名/HTTPS 仍为生产正式化待办。

### 自动化脚本

- [x] `bash blockhub.sh ga-checklist` 八项 + GA#9（`SKIP_APK=1`）
- [x] `bash blockhub.sh server-test` 能力全链路
- [x] `bash scripts/smoke-w5.sh` 契约/审计
- [x] `bash scripts/load-10vu.sh` P95 压测
- [x] Playwright：`home-publish` / `publish-runtime-plaza` / `runtime-mobile-h5` / `ga9-manifest-crop`

### 功能

- [x] Catalog PostgreSQL ≥114
- [x] 7 Agent 注册
- [x] 发布 → runtime `/r/{id}` → plaza
- [x] RAG pgvector + 审批 PG
- [x] Home 三视图发布 API + UI E2E
- [x] per-app APK build-queue + 503 下载语义
- [x] Flutter 自选能力：`bash blockhub.sh flutter-build --list`

- [x] GA#9 模块化裁剪（只勾 shanghai_voice → manifest 仅语音包）

### 运维待办（生产正式化）

- [x] 域名 + HTTPS 全站（`www.blockhub.club` · Let's Encrypt）
- [x] JWT 轮换：**本期不做**（密钥保持现状即可）
- [x] PG 每日备份脚本 + 恢复演练脚本（见下）
- [ ] 生产机执行：`INSTALL=1 bash scripts/setup-p1-cron.sh` + `bash scripts/pg-backup-drill.sh`
- [ ] 监控告警（health cron 随 setup-p1-cron 安装）
- [ ] 腾讯云 PG 可选迁移（`migrate-tencentdb.sh`，**当前跳过**）

### PG 备份与恢复（P1-3）

```bash
cd ~/blockhub && git pull

# 安装 cron：每日 03:00 备份（保留 14 天）+ 每 5 分钟 health-watch
INSTALL=1 bash scripts/setup-p1-cron.sh https://www.blockhub.club

# 立即试跑 + 演练恢复到临时库 *_restore_drill（随后删除，不碰业务库）
bash scripts/pg-backup-drill.sh

# 仅备份 / 仅恢复演练
bash blockhub.sh pg-backup
DRILL=1 bash blockhub.sh pg-restore backups/postgres/trackchat_YYYYMMDD_HHMMSS.sql.gz

# 覆盖生产库（危险）
CONFIRM=YES bash blockhub.sh pg-restore backups/postgres/trackchat_YYYYMMDD_HHMMSS.sql.gz
```

演练记录默认写在 `backups/postgres/DRILL-*.txt`。

### CLI 提示

若在 `e2e/` 子目录执行脚本报 `No such file`，请用仓库根目录 CLI：

```bash
bash /root/blockhub/blockhub.sh flutter-build --list
bash /root/blockhub/blockhub.sh ga-checklist http://124.222.177.43
```

---

## 六、端口与角色对照（开发 vs 生产）

| 角色 | 开发地址 | 生产域名 |
|------|----------|----------|
| **Home 主页（方案 A/B/C）** | http://127.0.0.1:5173 | https://app.trackchat.com |
| **高级开发模式 Admin** | http://127.0.0.1:5174 | https://admin.trackchat.com |
| **FastAPI 后端** | http://127.0.0.1:8001 | https://api.trackchat.com |
| **API 文档** | http://127.0.0.1:8001/docs | 生产建议关闭或内网 |

---

## 七、你需要做的最小行动顺序

1. **买服务器 + 域名 + 备案**（国内必须）
2. **安装 Docker、PostgreSQL、Redis、Nginx**
3. **把后端从内存改为 PostgreSQL**（最高优先级）
4. **构建 `home/dist` + `frontend/dist` 上传到服务器**
5. **配置 Nginx 三个域名 + SSL**
6. **配置 `.env` 并启动 uvicorn（或 Docker）**
7. **执行 seed 灌入 114 场景**
8. **浏览器验证：app 域名创建 → admin 域名管理 → API 正常**

---

## 八、当前项目本地启动

```powershell
cd cozecode
.\start-all.ps1
```

- Home 主页：http://127.0.0.1:5173（方案 A 默认）
- 高级开发：http://127.0.0.1:5174
- API：http://127.0.0.1:8001/docs
