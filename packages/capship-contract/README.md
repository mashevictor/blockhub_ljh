# CapShip Contract（L2）

纯 Python：`capability_keys` → `page_schema` / `build_manifest` / `android_app_id`。

无 FastAPI、无 SQLAlchemy、无产品文案、无 LLM。

## 安装（monorepo）

```bash
pip install -e packages/capship-contract
```

## 白标环境变量

| 变量 | 默认 | 含义 |
|------|------|------|
| `CAPSHIP_WEB_PKG_PREFIX` | `@blockhub/web-capability` | npm 能力包前缀 |
| `CAPSHIP_ANDROID_VENDOR` | `com.blockhub` | Android applicationId 根 |
| `CAPSHIP_PUB_PREFIX` | `capability_` | Flutter 包名前缀 |

开源示范可设：`CAPSHIP_WEB_PKG_PREFIX=@capship/web-capability` · `CAPSHIP_ANDROID_VENDOR=com.capship`

## 验收

```bash
# Ubuntu 请用 python3（无 python 命令）
python3 packages/capship-contract/tests/run_smoke.py
# 或
backend/.venv/bin/python packages/capship-contract/tests/run_smoke.py
```
