# BlockHub 分批任务清单（GA 后 · v0.2.0-ga → v1.0）

> 更新：2026-07-13 · 策略：**先 push 代码 → 分批开发 → 每批独立验收**

---

## 批次 0 · 基线确认（0.5 天 · 运维）

**目标**：确认 v0.2.0-ga + 最新 main 在 staging 可签字。

| # | 任务 | 负责 | 验收命令 |
|---|------|------|----------|
| 0.1 | 服务器 `git pull` + 重启 API | 运维 | `systemctl restart blockhub-api` |
| 0.2 | GA signoff / 批次0 全绿 | 运维 | `bash blockhub.sh batch0 http://101.32.209.251` |
| 0.3 | GA#9 裁剪 E2E | 运维 | `npx playwright test ga9-manifest-crop.spec.ts` |
| 0.4 | GA 截图 / 输出归档 | 运维 | 保存 signoff 日志 |

**批次 0 状态**：✅ 脚本就绪；服务器需 `git pull` 后复验

---

## 批次 1 · P1 生产正式化（1–2 天 · 运维为主）

**目标**：从 IP 演示环境升级为可对外生产。

| # | 任务 | 类型 | 验收 |
|---|------|------|------|
| 1.1 | 域名 DNS → app / admin / api | 运维 | `curl -I https://app.xxx` 200 |
| 1.2 | Nginx + Let's Encrypt | 运维 | 参考 `scripts/nginx-ssl-example.conf` |
| 1.3 | JWT + 默认密码轮换 | 运维 | `bash blockhub.sh secrets-check` 0 fail |
| 1.4 | PG 每日备份 cron | 运维 | `setup-p1-cron.sh` + 恢复演练 |
| 1.5 | 健康监控 + 告警 | 运维 | `health-watch.sh` cron |
| 1.6 | 腾讯云 PG | 可选 | 跳过 |
| 1.7 | COS 对象存储 | 可选 | 有桶再开 |

**代码就绪**：✅ `batch1-verify.sh` · `setup-p1-cron.sh` · `blockhub.sh batch1`

**批次完成标准**：HTTPS 全站 · secrets-check 全绿 · 备份可恢复 · health-watch 告警通

---

## 批次 2 · 发布→APK 全链路（2–3 天 · 代码 + 测试）

| # | 任务 | 类型 | 状态 |
|---|------|------|------|
| 2.1 | E2E publish → poll → GET /download 200 | 代码 | ✅ |
| 2.2 | 构建状态 UI（Home DeliveryProgress） | 代码 | ✅ |
| 2.3 | `batch2-verify.sh` + Gradle 锁 | 脚本 | ✅ `9049969` |
| 2.4 | APK 排障文档 | 文档 | ✅ |

**服务器验收**：

```bash
cd /root/blockhub && git pull
systemctl restart blockhub-api
bash blockhub.sh batch2 http://101.32.209.251 2>&1 | tee /tmp/batch2.log
```

---

## 批次 3 · CI / E2E 门禁（1 天 · DevOps）

| # | 任务 | 类型 | 状态 |
|---|------|------|------|
| 3.1 | GitHub Secret `E2E_STAGING_BASE` | 运维 | ⬜ 待配置 |
| 3.2 | `e2e-staging-pr.yml` | CI | ✅ |
| 3.3 | 失败 artifact 上传 | CI | ✅ |
| 3.4 | `docs/GITHUB-E2E-SETUP.md` | 文档 | ✅ |
| 3.5 | `batch3-verify.sh` | 脚本 | ✅ |

**批次完成标准**：PR 触 staging home-publish + ga9 绿

---

## 批次 4 · Flutter 模块化 M10–M11（3–5 天 · 代码）

| # | 任务 | 类型 | 状态 |
|---|------|------|------|
| 4.1 | Melos 4 包骨架 | 代码 | ✅ `packages/capability_*` |
| 4.2 | go_router Shell + `/cap/:key` | 代码 | ✅ `capability_shell_router.dart` |
| 4.3 | app.dart 接 Router | 代码 | ✅ |
| 4.4 | voice-only / dual-module 回归 | 测试 | 🔶 待服务器 flutter-build |

**验收**：`bash blockhub.sh batch4`

---

## 批次 5 · Web 真渲染率 70%（3–5 天 · 代码）

| # | 任务 | 类型 | 状态 |
|---|------|------|------|
| 5.1 | manifest 覆盖率脚本 | 脚本 | ✅ `batch5-verify.sh` |
| 5.2 | web-capability 包 | 代码 | ✅ 13+ 包 smoke 绿 |
| 5.3 | Flutter Audit / Mask 专属页 | 代码 | ✅ |
| 5.4 | WidgetHost 缺组件降级 UX | 代码 | ✅ |

**验收**：`bash blockhub.sh batch5`

---

## 批次 6–7 · P2 后期 / 增长

详见 **`docs/ROADMAP-P2-P3.md`**（Flavor · 推送 · Catalog · 多租户）

---

## 当前进度快照

| 批次 | 状态 |
|------|------|
| GA v0.2.0-ga | ✅ tag 已打 |
| 批次 0 | 🔶 待服务器 pull 复验 |
| 批次 1 | 🔶 脚本 ✅ · 运维待执行 |
| 批次 2 | 🔶 代码 ✅ · 待重跑 batch2 |
| 批次 3 | 🔶 workflow ✅ · 缺 GitHub secret |
| 批次 4 | ✅ 骨架 + go_router |
| 批次 5 | ✅ 降级 UX + Flutter 页 |
| 批次 6–7 | 📋 路线图已写 |

---

## 每批测试模板

```bash
cd /root/blockhub && git pull

bash blockhub.sh batch0 http://101.32.209.251   # SKIP_APK=1 可选
bash blockhub.sh batch1 http://101.32.209.251
bash blockhub.sh batch2 http://101.32.209.251
bash blockhub.sh batch3
bash blockhub.sh batch4
bash blockhub.sh batch5
```
