# 部署与数据库

## 域名 blockhub.club

DNS（注册商后台）两条 A 记录指向 `124.222.177.43`：

| 主机 | 类型 | 值 |
|------|------|-----|
| `@` | A | `124.222.177.43` |
| `www` | A | `124.222.177.43` |

Nginx 模板已含 `server_name blockhub.club www.blockhub.club 124.222.177.43`。`deploy-one.sh` 会写入站点配置。

生产 `.env` 建议：

```bash
PUBLIC_BASE_URL=https://blockhub.club
CORS_ORIGINS=https://blockhub.club,https://www.blockhub.club,http://blockhub.club,http://www.blockhub.club,http://124.222.177.43
```

HTTPS（解析生效后）：

```bash
sudo certbot --nginx -d blockhub.club -d www.blockhub.club
```

## 部署前：确认代码已更新

```bash
cd ~/blockhub
git pull
git log -1 --oneline
cd backend && source .venv/bin/activate
alembic upgrade head
alembic current
```

## 一键命令

```bash
# 网页（含 Nginx 刷新、HTML 缓存版本 bump）
cd ~/blockhub
git pull
cd home && npm install && cd ..
bash scripts/deploy-one.sh

# 上海话网页 + 测试 APK
bash scripts/deploy-shanghai-one.sh
```

## 发布 → 专属 APK（弹幕 / 创建区）

用户点弹幕「生成应用」或 PromptView 发布后：

1. 后端写入 `page_schema` + `build_manifest`（网页 `/r/{appId}` 按所选模块渲染）
2. 自动排队 `flutter-build-from-publish.sh`，按 `capability_keys` 选择构建配置（如 `shanghai_voice` → 语音演示 APK）
3. 产物：`backend/uploads/apks/{appId}.apk`，前端轮询 `GET /runtime/{appId}` 的 `apk_ready`

上海话弹幕验收：点「上海话语音助手」→ 生成应用 → 我的应用里等 APK 打包完成 → 下载安装。

手动重打某个应用：

```bash
# 需先有 .build-queue/{appId}.json（publish 时自动写入）
bash scripts/flutter-build-from-publish.sh <appId>
```

## Alembic stamp 漂移（常见问题）

**现象**：`alembic current=016/017`，但 `catalog_chip_templates` 等表不存在 → `/catalog/summary` 500。

**修复**：

```bash
bash scripts/fix-catalog.sh
bash scripts/smoke-db.sh http://127.0.0.1:8001
```

**Agent / Cursor**：见 `.cursor/skills/blockhub-db-deploy/` 与 `.cursor/rules/blockhub-db-schema-drift.mdc`
