# CapShip 示范仓骨架（技术预览）

最小开源示范范围：**chat_qa + approval_flow + 最小 runtime**。

本目录是 BlockHub monorepo 内的骨架说明；完整独立仓在 EXTRACTION 阶段 2–3 抽出。

## 依赖（L2）

```bash
pip install -e ../../packages/capship-contract
python - <<'PY'
from capship_contract import build_page_schema, build_manifest, android_app_id_for_public_id
keys = ["chat_qa", "approval_flow"]
print(build_page_schema(keys)["routes"])
print(build_manifest(keys)["web_pkgs"])
print(android_app_id_for_public_id("demo-app"))
PY
```

## 白标（阶段 0）

```bash
export CAPSHIP_WEB_PKG_PREFIX=@capship/web-capability
export CAPSHIP_ANDROID_VENDOR=com.capship
export CAPSHIP_PUB_PREFIX=capship_
```

## 目录目标（抽出后）

```
capship-demo/
  packages/contract/          # = packages/capship-contract
  packages/web-runtime/       # 精简 runtime-web
  packages/web-capability-chat/
  packages/web-capability-approval/
  apps/demo/                  # 静态 fixture schema 渲染
  README.md                   # 选型即交付最小路径
```

## 不做

- 广场 / 预约演示 / 上海话 / 行业 114 Catalog
- LLM 进 publish 热路径
