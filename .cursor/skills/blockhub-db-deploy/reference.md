# BlockHub DB Schema 漂移 — 详细 Runbook

## 症状对照

| 现象 | 含义 |
|------|------|
| `alembic current=016/017` + `catalog_* does not exist` | stamp 超前，003/004 未执行 |
| `Catalog /summary HTTP 500` | catalog 表缺或 seed 失败 |
| `smoke-db` catalog 失败，其余通过 | 仅 catalog 层问题，API/用户表正常 |
| `fix-catalog` seed 报 `DELETE FROM catalog_chip_templates` | 表不存在，需先 `alembic upgrade head` 到 017+ |

## 为何 `alembic upgrade head` 单独不够

1. `alembic_version.version_num = 016`
2. 迁移 003/004 在 alembic 眼里「已应用」
3. `upgrade head` 无新迁移可跑 → 表仍缺失
4. **017** 用 `create_table_if_missing` 在 head 上幂等补表

## 标准修复流程

```bash
cd ~/blockhub
git pull

cd backend && source .venv/bin/activate
alembic upgrade head    # → 017 (head)
alembic current

cd ~/blockhub
bash scripts/fix-catalog.sh

bash scripts/smoke-db.sh http://127.0.0.1:8001
# 预期: 8 passed, 0 failed
```

## 预防（写迁移 / 部署时）

1. **禁止**在生产库上随意 `alembic stamp head` 而不跑 upgrade
2. 新表用 `create_table_if_missing`（012–017 模式）
3. `deploy.sh` / `repair-db.sh` 部署后跑 `smoke-db.sh`
4. catalog 相关 seed 前确保 8 张 catalog 表存在

## Catalog 表清单（003 + 004）

- `catalog_agents`
- `catalog_capabilities`
- `catalog_office_groups`
- `catalog_industry_packs`
- `catalog_office_scenarios`
- `catalog_industry_scenarios`
- `catalog_hero_presets`
- `catalog_chip_templates`

## 一键部署命令速查

```bash
# 仅网页（B2B 首页、弹幕、预约）
bash scripts/deploy-one.sh

# 上海话网页 + 测试 APK
bash scripts/deploy-shanghai-one.sh
```

HTML 缓存版本：每次 `npm run build` 自动写入 `version.txt`；package.json 版本号变更会体现在构建标签中。
