---
name: blockhub-db-deploy
description: >-
  BlockHub 部署与 PostgreSQL/Alembic 修复。当用户遇到 deploy、alembic、smoke-db、
  catalog/summary 500、UndefinedTable、catalog_chip_templates 缺失、stamp 漂移、
  fix-catalog、repair-db 时使用本 skill。
---

# BlockHub DB 部署与 Schema 漂移

## 核心问题（反复出现）

**alembic_version 已 stamp 到 head，但真实 PG 表未建全**（常见于历史 `alembic stamp` 跳过 003/004）。

典型报错：

- `relation "catalog_chip_templates" does not exist`
- `GET /catalog/summary` → HTTP 500
- `smoke-db`: alembic=016/017 ✓，但 catalog 检查失败

**根因**：`alembic upgrade head` 只跑「未记录」的迁移；若版本号已超前，003/004 的 `create_table` 不会重跑。

## 修复顺序（服务器 ~/blockhub）

```bash
cd ~/blockhub && git pull
bash scripts/fix-catalog.sh
bash scripts/smoke-db.sh http://127.0.0.1:8001
```

或分步：

```bash
cd backend && source .venv/bin/activate
alembic upgrade head          # 必须含 017 repair_catalog（幂等补 catalog 表）
bash ~/blockhub/scripts/fix-catalog.sh   # force seed + 重启 API
```

## 诊断命令

```bash
# alembic 记录 vs 真实表
alembic current
python3 -c "
from sqlalchemy import inspect
from app.db.session import engine
t=['catalog_chip_templates','catalog_hero_presets','catalog_agents']
insp=inspect(engine)
print({x: insp.has_table(x) for x in t})
"

curl -s http://127.0.0.1:8001/api/v1/catalog/summary
journalctl -u blockhub-api -n 30 --no-pager
```

## 新增迁移的约定

凡补「可能因 stamp 缺失」的表，迁移必须 **幂等**：

```python
from ops_utils import create_table_if_missing, create_index_if_missing
# 不要用裸 op.create_table（重复跑会失败，且 stamp 超前时永远不跑）
```

参考：`backend/alembic/versions/017_repair_catalog_tables.py`

## 相关脚本

| 脚本 | 用途 |
|------|------|
| `scripts/deploy-one.sh` | 网页一键部署 |
| `scripts/deploy-shanghai-one.sh` | 网页 + 上海话 APK |
| `scripts/repair-db.sh` | alembic 漂移检测 + upgrade |
| `scripts/fix-catalog.sh` | 补 catalog 表 + force seed |
| `scripts/smoke-db.sh` | DB 冒烟 |

## 详细 runbook

见 [reference.md](reference.md)
