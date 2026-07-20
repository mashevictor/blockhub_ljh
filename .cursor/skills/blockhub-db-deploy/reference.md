# BlockHub DB Schema 漂移 — 详细 Runbook

## 症状对照

| 现象 | 含义 |
|------|------|
| `alembic current=head` + `catalog_* does not exist` | stamp 超前，003/004 未执行 |
| `Catalog /summary HTTP 500` / `source`≠`database` | catalog 表缺、seed 失败，或 API 未起来 |
| nginx **502** + `blockhub-api` exit 1 | 先查 journal（常见：Python import 崩溃），修好 API 再跑 fix-catalog |
| `ValueError: Invalid format specifier ... tool_pad` | `compose_edit._SYSTEM` f-string 未转义 `{}` |
| `Command 'python' not found` | Ubuntu 用 `python3` 或 `backend/.venv/bin/python` |
| `smoke-db` catalog 失败，其余通过 | 仅 catalog 层问题，API/用户表正常 |
| `fix-catalog` seed 报 `DELETE FROM catalog_chip_templates` | 表不存在，需先幂等补表（017 路径） |

## 为何 `alembic upgrade head` 单独不够

1. `alembic_version.version_num` 已是较新 head
2. 迁移 003/004 在 alembic 眼里「已应用」
3. `upgrade head` 无新迁移可跑 → 表仍缺失
4. **017**（及后续 repair）用 `create_table_if_missing` 在 head 上幂等补表；`fix-catalog.sh` 会直接跑 repair DDL

## 标准修复流程（含期望输出）

```bash
cd ~/blockhub
git pull
sudo systemctl restart blockhub-api
sleep 2
curl -s http://127.0.0.1:8001/api/v1/health
# → {"status":"ok",...,"redis":"ok"}

bash scripts/fix-catalog.sh
# → using PY=.../.venv/bin/python
# → 8 表 OK · alembic head · seed OK · catalog/summary OK (database)

curl -s http://127.0.0.1:8001/api/v1/catalog/summary
# → "source":"database"，hero_preset_count / chip_template_count > 0

bash scripts/smoke-db.sh http://127.0.0.1:8001
bash scripts/deploy-one.sh   # 前端；API 未绿时不要指望 version.txt 更新
```

### 生产已验 seed / summary 数量级（2026-07-20 · alembic 038）

| 指标 | 约值 |
|------|------|
| agents | 51 |
| capabilities | 80 |
| office_scenarios | 103 |
| industry_scenarios | 258 |
| hero_presets | 35 |
| chip_templates | 7 |
| industry_packs | 20 |
| office_groups | 8 |

数量随 seed 迭代可变；**硬门禁**是 `source=database` 且 hero/chips 非空。

### catalog/summary 黄金样例

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

## 预防（写迁移 / 部署时）

1. **禁止**在生产库上随意 `alembic stamp head` 而不跑 upgrade
2. 新表用 `create_table_if_missing`（012–017 模式）
3. 含 JSON 示例的 **f-string / `.format` 提示词**必须把 `{` `}` 写成 `{{` `}}`，或改成普通字符串，避免 import 时拖垮 API
4. 脚本禁止依赖裸 `python` 命令
5. `deploy.sh` / `fix-catalog.sh` 部署后确认 catalog summary

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
bash scripts/deploy-one.sh
bash scripts/deploy-shanghai-one.sh
```

HTML 缓存版本：每次 `npm run build` 自动写入 `version.txt`；package.json 版本号变更会体现在构建标签中。
