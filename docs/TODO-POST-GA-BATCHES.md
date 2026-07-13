# BlockHub 分批任务清单（GA 后 · v0.2.0-ga → v1.0）

> 生成：2026-07-13 · 策略：**先 push 代码 → 分批开发 → 每批独立验收**

---

## 批次 0 · 基线确认（0.5 天 · 运维）

**目标**：确认 v0.2.0-ga + 最新 main 在 staging 可签字。

| # | 任务 | 负责 | 验收命令 |
|---|------|------|----------|
| 0.1 | 服务器 `git pull` + 重启 API | 运维 | `systemctl restart blockhub-api` |
| 0.2 | GA signoff 全绿 | 运维 | `SKIP_APK=1 bash blockhub.sh signoff http://101.32.209.251` |
| 0.3 | GA#9 裁剪 E2E | 运维 | `npx playwright test ga9-manifest-crop.spec.ts` |
| 0.4 | GA 截图 / 输出归档 | 运维 | 保存 signoff 日志 |

**批次完成标准**：signoff 0 fail · GA 9/9 绿

---

## 批次 1 · P1 生产正式化（1–2 天 · 运维为主）

**目标**：从 IP 演示环境升级为可对外生产。

| # | 任务 | 类型 | 验收 |
|---|------|------|------|
| 1.1 | 域名 DNS → app / admin / api | 运维 | `curl -I https://app.xxx` 200 |
| 1.2 | Nginx + Let's Encrypt | 运维 | 参考 `nginx-ssl-example.conf` |
| 1.3 | JWT + 默认密码轮换 | 运维 | `bash blockhub.sh secrets-check` 0 fail |
| 1.4 | PG 每日备份 cron | 运维 | crontab + 手动恢复演练 |
| 1.5 | 健康监控 + 告警 | 运维 | `health-watch.sh` cron + 5xx 通知 |
| 1.6 | 腾讯云 PG | 可选 | 有实例再跑 `migrate-tencentdb.sh` |
| 1.7 | COS 对象存储 | 可选 | KB 大文件上云 |

**批次完成标准**：HTTPS 全站 · secrets-check 全绿 · 备份可恢复 · health-watch 告警通

---

## 批次 2 · 发布→APK 全链路（2–3 天 · 代码 + 测试）

**目标**：M12 稳定「发布 → 后台构建 → 200 下载」。

| # | 任务 | 类型 | 验收 |
|---|------|------|------|
| 2.1 | E2E：publish → poll ready → GET /download 200 | 代码 | 新 spec + CI |
| 2.2 | 构建失败重试 / 状态机 UI（Home） | 代码 | pending/building/failed 可见 |
| 2.3 | `smoke-apk.sh` 纳入 signoff（可选 SKIP_APK） | 脚本 | 服务器 APK 构建绿 |
| 2.4 | build-queue 日志与 `.build-status` 文档 | 文档 | 排障手册 |

**批次完成标准**：deliver=app 发布 → 30min 内 download 200（或 CI mock 超时策略）

---

## 批次 3 · CI / E2E 门禁（1 天 · DevOps）

**目标**：PR 合并前自动验 staging。

| # | 任务 | 类型 | 验收 |
|---|------|------|------|
| 3.1 | GitHub Secret `E2E_STAGING_BASE` | 运维 | repo settings |
| 3.2 | `e2e-staging-pr.yml` PR 跑通 | CI | PR 上 job 绿 |
| 3.3 | `test:api` 纳入 ga-checklist / ci-smoke | 已有 | CI main 绿 |
| 3.4 | browser E2E 失败 artifact 上传 | CI | 可选增强 |

**批次完成标准**：PR 触 staging home-publish + ga9 绿

---

## 批次 4 · Flutter 模块化 M10–M11（3–5 天 · 代码）

**目标**：Melos 物理拆包 + go_router Shell。

| # | 任务 | 类型 | 验收 |
|---|------|------|------|
| 4.1 | Melos：`packages/capability_*` 首批 4 包 | 代码 | `melos bootstrap` |
| 4.2 | go_router Shell 接 manifest menu | 代码 | Tab 路由 + deep link |
| 4.3 | 删 app.dart 硬编码入口 | 代码 | 全走 Registry |
| 4.4 | voice-only / dual-module APK 回归 | 测试 | flutter-build-custom |

**批次完成标准**：Melos 4 包 + go_router 导航 + 自选 APK 与 GA#9 一致

---

## 批次 5 · Web 真渲染率 70%（3–5 天 · 代码）

**目标**：Phase 5 从 ~50% 提升到 ~70%。

| # | 任务 | 类型 | 验收 |
|---|------|------|------|
| 5.1 | 盘点 manifest 无 Web 包的 capability | 分析 | 清单 HTML |
| 5.2 | 再补 3–5 个 web-capability 包 | 代码 | smoke-web-packages |
| 5.3 | Flutter 专属页（非 ReportPage fallback） | 代码 | 2–3 个 capability |
| 5.4 | runtime-web 缺 Widget 降级 UX | 代码 | 无 blank 屏 |

**批次完成标准**：smoke-web-packages 全绿 · 抽样 10 场景 /r/:id 无 missing widget

---

## 批次 6 · Flavor / 体积 / 推送（5+ 天 · P2 后期）

| # | 任务 | 验收 |
|---|------|------|
| 6.1 | flutter_flavorizr 白标 | 2 客户包名/图标 |
| 6.2 | deferred import 体积裁剪 | APK 体积对比 |
| 6.3 | Shorebird 热更新 PoC | 补丁下发 |
| 6.4 | TPNS 推送 | 离线通知 |

---

## 批次 7 · 增长 P2–P3（v0.3+ · 产品迭代）

| # | 领域 | 大任务 |
|---|------|--------|
| 7.1 | P0 遗留 | OpenAPI 冻结 · PromptView 状态机 · Logo 资产 |
| 7.2 | P1 运营 | 20 行业完善 · 弹幕后台 · Admin 下架/编辑 |
| 7.3 | P2 智能化 | LLM 场景理解 · Catalog CRUD · 多租户 |
| 7.4 | P3 生态 | 模板市场 · 插件 SDK · 私有化 Compose · i18n |

---

## 推荐执行顺序

```
批次 0（基线）→ 批次 1（P1 运维）→ 批次 2（APK 全链路）
     ↓
批次 3（CI 门禁） 与 批次 4（Flutter）可并行
     ↓
批次 5（Web 70%）→ 批次 6（Flavor）→ 批次 7（增长）
```

---

## 每批测试模板（复制）

```bash
cd /root/blockhub && git pull

# 批次 0
SKIP_APK=1 bash blockhub.sh signoff http://101.32.209.251

# 批次 1
bash blockhub.sh secrets-check
bash blockhub.sh health-watch http://101.32.209.251 --strict
bash blockhub.sh pg-backup

# 批次 2
bash scripts/smoke-apk.sh http://101.32.209.251
cd e2e && npm run test:api

# 批次 3（GitHub Actions 自动）

# 批次 4
bash blockhub.sh flutter-build chat_qa,shanghai_voice --public-id batch4test
```

---

## 当前进度快照

| 批次 | 状态 |
|------|------|
| GA v0.2.0-ga | ✅ tag 已打 |
| 批次 0 | 🔶 待服务器 pull 复验 |
| 批次 1 | ⬜ 脚本就绪，未执行 |
| 批次 2 | 🔶 apk_status E2E 已有，缺 poll→200 |
| 批次 3 | 🔶 workflow 已有，缺 secret |
| 批次 4–7 | ⬜ 未开始 |
