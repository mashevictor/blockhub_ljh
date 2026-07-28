# GitHub Actions · Staging E2E 配置

## 1. 添加 Secret

仓库 **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value 示例 |
|------|------------|
| `E2E_STAGING_BASE` | `http://124.222.177.43` |

不要带尾部 `/api/v1`。

## 2. 触发方式

- **PR → main**：自动跑（secret 存在时）
- **手动**：Actions → `E2E Staging (PR optional)` → Run workflow

## 3. 包含测试

- `home-publish.spec.ts`（浏览器）
- `runtime-mobile-h5.spec.ts`（移动端）
- `ga9-manifest-crop.spec.ts`（API）

## 4. 失败排查

- PR 页 → Checks → 下载 `playwright-report` artifact
- 服务器需已 deploy 最新 Home + API

## 5. 本地对照

```bash
bash blockhub.sh batch3
E2E_HOME_URL=http://124.222.177.43 E2E_BASE_URL=http://124.222.177.43 \
  E2E_API_URL=http://124.222.177.43/api/v1 \
  bash -c 'cd e2e && npx playwright test tests/home-publish.spec.ts --project=chromium'
```
