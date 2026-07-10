# 部署与数据库

## 一键命令

```bash
# 网页（B2B 首页、弹幕、预约）
bash scripts/deploy-one.sh

# 上海话网页 + 测试 APK
bash scripts/deploy-shanghai-one.sh
```

## Alembic stamp 漂移（常见问题）

**现象**：`alembic current=016/017`，但 `catalog_chip_templates` 等表不存在 → `/catalog/summary` 500。

**修复**：

```bash
bash scripts/fix-catalog.sh
bash scripts/smoke-db.sh http://127.0.0.1:8001
```

**Agent / Cursor**：见 `.cursor/skills/blockhub-db-deploy/` 与 `.cursor/rules/blockhub-db-schema-drift.mdc`
