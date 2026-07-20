---
name: blockhub-db-deploy
description: >-
  BlockHub 部署与 PostgreSQL/Alembic 修复。当用户遇到 deploy、alembic、smoke-db、
  catalog/summary 500、UndefinedTable、catalog_chip_templates 缺失、stamp 漂移、
  fix-catalog、repair-db、nginx 502、blockhub-api 起不来、Invalid format specifier、
  Command 'python' not found 时使用本 skill。
---

# BlockHub DB 部署与 Schema 漂移

## 核心问题（反复出现）

**alembic_version 已 stamp 到 head，但真实 PG 表未建全**（常见于历史 `alembic stamp` 跳过 003/004）。

典型报错：

- `relation "catalog_chip_templates" does not exist`
- `GET /catalog/summary` → HTTP 500 / fix-catalog 报 `catalog/summary still failing`
- nginx **502 Bad Gateway**（API 进程挂了，常见连带 catalog 假失败）
- `smoke-db`: alembic=head ✓，但 catalog 检查失败
- `Command 'python' not found`（Ubuntu 只有 `python3` / `.venv/bin/python`）

**根因**：`alembic upgrade head` 只跑「未记录」的迁移；若版本号已超前，003/004 的 `create_table` 不会重跑。

## 标准修复（服务器 ~/blockhub）— 已验收黄金路径

```bash
cd ~/blockhub && git pull
sudo systemctl restart blockhub-api   # 若 journal 显示 import 崩溃，先 pull 再 restart
sleep 2
curl -s http://127.0.0.1:8001/api/v1/health
bash scripts/fix-catalog.sh
curl -s http://127.0.0.1:8001/api/v1/catalog/summary
# 可选
bash scripts/smoke-db.sh http://127.0.0.1:8001
bash scripts/deploy-one.sh            # API/catalog 绿后再部署前端
```

### 期望输出（生产已验 · 2026-07-20）

**health**

```json
{"status":"ok","service":"TrackChat PaaS API","redis":"ok"}
```

**fix-catalog 关键步骤**

- `using PY=/root/blockhub/backend/.venv/bin/python`（勿用裸 `python`）
- 8 张 catalog 表 + enrichment cols：`OK`
- `alembic current` → `038 (head)`（版本号随仓库演进，须为 head）
- seed 示例：`agents=51 capabilities=80 office_scenarios=103 industry_scenarios=258 hero_presets=35 chip_templates=7 industry_packs=20`
- `catalog/summary OK (database)` · `source=database`

**catalog/summary 黄金样例**

```json
{
  "office_count": 103,
  "industry_count": 258,
  "total": 361,
  "capability_count": 80,
  "agent_count": 51,
  "industry_packs": 20,
  "office_groups": 8,
  "hero_preset_count": 35,
  "chip_template_count": 7,
  "source": "database"
}
```

判定：**必须** `"source":"database"`；hero/chips 为 0 或 summary 非 JSON → 未修好。

### API 起不来 / 502（先看 journal，再 fix-catalog）

```bash
journalctl -u blockhub-api -n 40 --no-pager
```

| 日志特征 | 处理 |
|----------|------|
| `ValueError: Invalid format specifier ... tool_pad` | `compose_edit._SYSTEM` 的 f-string 里裸 JSON `{}`；pull 含修复的 commit 后 `systemctl restart blockhub-api` |
| `ModuleNotFoundError` / 其它 import 崩 | pull + 查最近改动；修好前 fix-catalog 会因 API 挂而误报 catalog |
| 表缺失 / UndefinedTable | 走下方 stamp 漂移流程 |

**注意**：API 挂掉时 `fix-catalog` 末尾 curl summary 也会失败，**先恢复 uvicorn，再判 catalog**。

### Catalog seed FK：`agent_id` 不在 `catalog_agents`

报错示例：`Key (agent_id)=(quality_inspect) is not present in table "catalog_agents"`。

```bash
git pull
bash scripts/fix-catalog.sh
```

## 诊断命令

```bash
cd ~/blockhub/backend && source .venv/bin/activate
alembic current
# 一律 python3 或 venv，禁止裸 python
python3 -c "
from sqlalchemy import inspect
from app.db.session import engine
t=['catalog_chip_templates','catalog_hero_presets','catalog_agents']
insp=inspect(engine)
print({x: insp.has_table(x) for x in t})
"

curl -s http://127.0.0.1:8001/api/v1/health
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
| `scripts/deploy-one.sh` | 网页一键部署（内部会调 fix-catalog） |
| `scripts/fix-catalog.sh` | 补 catalog 表 + force seed + 重启 API（用 venv/`python3`） |
| `scripts/repair-db.sh` | alembic 漂移检测 + upgrade |
| `scripts/smoke-db.sh` | DB 冒烟 |
| `packages/capship-contract/tests/run_smoke.py` | L2 契约冒烟（`python3` 跑，不依赖 catalog） |

## 详细 runbook

见 [reference.md](reference.md)
