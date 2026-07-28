# Release v0.2.0-ga

**日期**：2026-07-13  
**状态**：GA 正式版（General Availability）

---

## 概要

BlockHub 模块化交付 GA 正式版：1 Web runtime 壳 + 13 Web 能力包 + 1 Flutter 壳。用户勾选 capability → 发布 → runtime/plaza → per-app APK，全链路已在 staging `124.222.177.43` 验收通过。

---

## 相对 RC1 的增量

- **GA #9**：`ga9-manifest-crop.spec.ts` — 只勾 `shanghai_voice` → manifest/schema 仅语音包
- **文档同步**：功能清单 / 项目计划 / TODO 对齐当前进度
- **运维脚本**：`pg-backup`、`rotate-secrets-check`、`blockhub.sh` 统一 CLI

---

## 主要交付

### 契约与发布
- `capability_assembly`（requested / resolved / dropped）
- 自定义能力审核写回 registry + catalog
- per-app APK 503 语义（不回退 default.apk）
- Home 浏览器发布 E2E（`home-publish.spec.ts`）

### Web Runtime
- 13 个 `web-capability-*` 真渲染包
- runtime-web 移动端 H5 底部 Tab
- manifest 懒加载

### Flutter
- `CAPABILITY_KEYS` 菜单裁剪
- `flutter-build-custom.sh` / `blockhub.sh flutter-build` 自选打包
- NLQueryPage、IntegrationHubPage 专属页
- per-app `split-per-abi`

### 质量
- `ga-checklist.sh` 八项 + GA#9 裁剪
- `load-10vu.sh` P95 阈值
- GitHub Actions `ci-smoke.yml` + 手动 `e2e-browser.yml`
- Playwright API + 浏览器 E2E

---

## 服务器验收命令

```bash
cd /root/blockhub && git pull
bash scripts/deploy-all.sh --web-only
bash scripts/e2e-prep-browsers.sh

SKIP_APK=1 bash blockhub.sh signoff http://124.222.177.43
bash blockhub.sh server-test http://127.0.0.1:8001
```

---

## 已知限制（GA 后 P2）

- Flutter 物理拆包（Melos deferred import）未做，菜单级裁剪已就绪
- Flavor / Shorebird / TPNS 规划在 GA 后
- 腾讯云 PG staging 迁移待实跑（用户暂跳过）
- 域名 + 公网 HTTPS 待运维配置

---

## 升级说明

```bash
git pull
git checkout v0.2.0-ga
bash scripts/deploy-all.sh
bash scripts/repair-db.sh   # 如有 drift
systemctl restart blockhub-api
```
