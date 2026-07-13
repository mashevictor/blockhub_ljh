# BlockHub 路线图 · P2 后期 → v0.3+（批次 6–7）

> 与 `docs/TODO-POST-GA-BATCHES.md` 对齐 · 2026-07-13

---

## 批次 6 · Flavor / 体积 / 推送（v0.2.x）

| 项 | 说明 | 验收 |
|----|------|------|
| 6.1 flutter_flavorizr | 白标：包名 / 图标 / 启动图 | 2 客户 APK 并存 |
| 6.2 deferred import | 按 capability 懒加载减体积 | 构建前后 APK MB 对比 |
| 6.3 Shorebird PoC | OTA 热更新补丁 | 补丁下发 + 重启验证 |
| 6.4 TPNS / FCM | 离线推送 | 设备收到通知 |

**前置**：批次 2 APK 全链路稳定、批次 4 Melos 拆包起步。

---

## 批次 7 · 增长 P2–P3（v0.3+）

### 7.1 P0 遗留
- OpenAPI 冻结与 codegen
- PromptView 状态机完善
- Logo / 品牌资产统一

### 7.2 P1 运营
- 20 行业站点内容完善
- 弹幕 / 运营后台
- Admin 应用下架与编辑

### 7.3 P2 智能化
- LLM 场景理解（intent_agent 深化）
- Catalog CRUD 与行业包治理
- 多租户隔离与计费

### 7.4 P3 生态
- 模板市场与插件 SDK
- 私有化 Compose 部署包
- i18n / 多区域

---

## 建议里程碑

| 版本 | 内容 |
|------|------|
| v0.2.1 | 批次 1–3 运维 + CI 绿 |
| v0.2.2 | 批次 4–5 Flutter/Web 70% |
| v0.3.0 | 批次 6 Flavor + 推送 PoC |
| v0.4.0 | 批次 7 增长首批（Catalog + 多租户） |

---

## 不在本阶段范围

- 腾讯云 PostgreSQL 迁移（用户要求跳过）
- COS 大文件（可选，有桶再开）
