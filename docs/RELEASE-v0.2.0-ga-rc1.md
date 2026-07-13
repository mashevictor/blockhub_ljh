# Release v0.2.0-ga-rc1

**日期**：2026-07-13  
**状态**：GA Release Candidate 1

---

## 概要

BlockHub 解耦架构 GA 候选版：1 Web runtime 壳 + 12 Web 能力包 + 1 Flutter 壳，支持用户选型 → 发布 → runtime/plaza → per-app APK。

---

## 主要交付

### 契约与发布
- `capability_assembly`（requested / resolved / dropped）
- 自定义能力审核写回 registry + catalog
- per-app APK 503 语义（不回退 default.apk）
- Home 浏览器发布 E2E（`home-publish.spec.ts` ✅）

### Web Runtime
- 12 个 `web-capability-*` 真渲染包
- runtime-web 移动端 H5 底部 Tab
- manifest 懒加载

### Flutter
- `CAPABILITY_KEYS` 菜单裁剪
- `flutter-build-custom.sh` / `blockhub.sh flutter-build` 自选打包
- NLQueryPage、IntegrationHubPage 专属页
- per-app `split-per-abi`

### 质量
- `ga-checklist.sh` 八项自动化
- `load-10vu.sh` P95 阈值
- GitHub Actions `ci-smoke.yml`
- Playwright API + 浏览器 E2E

---

## 服务器验收命令

```bash
cd /root/blockhub && git pull
bash scripts/deploy-all.sh --web-only
bash scripts/e2e-prep-browsers.sh

SKIP_APK=1 bash blockhub.sh ga-checklist http://101.32.209.251
bash blockhub.sh server-test http://127.0.0.1:8001
```

---

## 已知限制

- Flutter 物理拆包（deferred import）未做，菜单级裁剪已就绪
- Flavor / Shorebird / TPNS 规划在 GA 后
- 腾讯云 PG staging 迁移待实跑

---

## 升级说明

```bash
git pull
bash scripts/deploy-all.sh
bash scripts/repair-db.sh   # 如有 drift
systemctl restart blockhub-api
```
