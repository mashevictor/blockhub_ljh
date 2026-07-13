# P1 · Flutter Parity 矩阵 + Manifest 构建脚本

> 目标：Web 选什么模块，Flutter 就有对应包与页面；publish 的 `build_manifest.flutter_pkgs` 驱动 **pubspec 依赖**与 **Melos 注册**，不再只靠菜单过滤。  
> 更新：2026-07-13

---

## 要准备多少（资源估算）

| 维度 | 数量 | 说明 |
|------|------|------|
| **人力** | 1 名 Flutter 主程 × **3 周** + 0.3 后端/脚本 | 可并行：脚本 3d + 迁包 12d + 验收 2d |
| **人日** | **~18–22 人日** | 不含 P1.5 Flutter 工具 14 项 |
| **新建 Melos 包** | **6 个** | kb / dashboard / nl_query / integration / security_mask / multi_agent |
| **完善已有包** | **4 个** | chat_qa / approval_flow / audit_log / shanghai_voice |
| **新脚本** | **3 个** | parity 矩阵 · pubspec 同步 · batch7 验收 |
| **改现有脚本** | **2 个** | `flutter-build-from-publish.sh` · `flutter-build-apk.sh` |
| **服务器** | 已有 | staging + Flutter/Android SDK（batch2 同款） |
| **依赖** | 无新 SaaS | 复用 `blockhub_flutter_core` + 现有 API |

**里程碑交付物**

| 周 | 交付 | 验收 |
|----|------|------|
| W1 | P1-0～P1-3 脚本链 + parity 报告 | `bash blockhub.sh flutter-parity` 绿 |
| W2 | P1-4～P1-8 核心业务包迁入 Melos | 6 包 `flutter analyze` 0 error |
| W3 | P1-9～P1-12 联调 + publish E2E | 两种 keys 组合 APK 菜单不同且 batch7 绿 |

---

## Parity 矩阵（13 Web 包 → Flutter）

原则：**按物理 Web 包聚合**，不按 manifest 里 50+ 逻辑 `flutter_pkg` 名各建一包（那是 codegen 约定名，P1 只建 **10 个业务 Flutter 包**）。

| # | Web 包 (`web_pkgs`) | 目标 Flutter 包 | 现状 | 覆盖 capability_keys（代表） | Issue |
|---|---------------------|-----------------|------|------------------------------|-------|
| 1 | `web-capability-chat` | `capability_chat_qa` | ✅ 已拆 | chat_qa, chat_voice, chat_summary | P1-4 polish |
| 2 | `web-capability-voice` | `capability_shanghai_voice` | ⚠️ 页在 runtime 桥接 | shanghai_voice, shanghai_voice_stream | P1-5 |
| 3 | `web-capability-approval` | `capability_approval_flow` | ✅ 已拆 | approval_flow, approval_inbox, form/list | P1-4 polish |
| 4 | `web-capability-audit-log` | `capability_audit_log` | ⚠️ 静态 demo | audit_* | P1-6 |
| 5 | `web-capability-kb` | `capability_kb` | ❌ runtime 无包 | kb_document, kb_* | P1-7 |
| 6 | `web-capability-dashboard` | `capability_dashboard` | ❌ `report_page.dart` | chart_*, notify_inapp, notify_email | P1-8 |
| 7 | `web-capability-data-nl-query` | `capability_data_nl_query` | ❌ `nl_query_page.dart` | data_nl_query | P1-9 |
| 8 | `web-capability-integration` | `capability_integration` | ❌ stub 页 | erp, meeting, helpdesk, asset, im, rbac | P1-10 |
| 9 | `web-capability-multi-agent` | `capability_multi_agent` | ❌ 无 | multi_agent | P1-11 |
| 10 | `web-capability-security-mask` | `capability_security_mask` | ❌ runtime 页 | security_mask / mask | P1-11 |
| 11 | `web-capability-auth-sso` | — | Web-only | auth_sso | P1 跳过 |
| 12 | `web-capability-creation` | — | Web-only（创作台） | creation | P1 跳过 |
| 13 | `web-capability-oa-connector` | 并入 integration | Web 连接器 | oa_* | P1-10 |

**P1 完成后物理包：10 业务 + 1 core = 11**（对齐 13 Web 中 10 个需 App 端的包）。

### Flutter 工具能力（14 项）→ P1.5，不在 P1 范围

`schedule_alarm` / `flutter_scan_qr` / `flutter_geolocation` 等：registry 有定义，**单独 epic**，约 +14 人日。

---

## Issue 清单

### P1-0 · 基线 & parity 报告脚本（2d）

**做什么**

- 新增 `scripts/flutter-parity-report.py`：读 `shared/capability-manifest.json`，输出 HTML + 终端表格（Web 包 / Flutter 包 / 页面来源 / 状态）
- 新增 `scripts/flutter-parity-report.sh` + `blockhub.sh flutter-parity`

**验收**

```bash
bash blockhub.sh flutter-parity
# 期望：13 行 Web 包，≥10 行 Flutter 为 ok 或 in-progress（P1 结束时 10/10 ok）
open docs/previews/flutter-parity-matrix.html
```

---

### P1-1 · 矩阵 SSOT 收口（1d）

**做什么**

- 在 `shared/flutter-parity-matrix.json` 手写/生成 **Web 包 → Flutter 包** 映射（覆盖上表）
- `codegen-capability-manifest.py` 增加 `physical_flutter_pkg` 字段（聚合名，区别于逻辑 `flutter_pkg`）
- 文档：本文件 + 矩阵 JSON 为唯一对照表

**验收**

```bash
python scripts/codegen-capability-manifest.py
python -c "import json; m=json.load(open('shared/flutter-parity-matrix.json')); assert len(m['rows'])==13"
```

---

### P1-2 · `flutter-sync-pubspec-from-manifest.py`（2d）

**做什么**

根据 `flutter_pkgs`（或 `capability_keys` → `build_manifest`）**重写 runtime-app 依赖块**：

```
输入:  --keys chat_qa,approval_flow  或  --manifest path/to/manifest.json
输出:  runtime-app/pubspec.yaml 的 dependency_overrides/path deps（仅选中包）
       runtime-app/lib/melos_capability_registry.g.dart（注册表 codegen）
```

**接口**

```bash
# 从 publish queue spec
python scripts/flutter-sync-pubspec-from-manifest.py \
  --spec backend/uploads/apks/.build-queue/{public_id}.json

# 从 keys 直传（本地调试）
python scripts/flutter-sync-pubspec-from-manifest.py \
  --keys chat_qa,kb_document,data_nl_query

#  dry-run 只打印将 link 的包
python scripts/flutter-sync-pubspec-from-manifest.py --keys chat_qa --dry-run
```

**规则**

- 始终依赖 `blockhub_flutter_core`
- `capability_*` 用 path 相对依赖
- 未选中包 **不出现在 pubspec**（P1 目标；P2 再做 deferred import 减体积）

**验收**

```bash
python scripts/flutter-sync-pubspec-from-manifest.py --keys chat_qa --dry-run | grep capability_
# 仅 capability_chat_qa

python scripts/flutter-sync-pubspec-from-manifest.py --keys chat_qa,approval_flow
cd runtime-app && flutter pub get && flutter analyze lib/melos_capability_registry.dart
```

---

### P1-3 · Manifest 构建链接入 publish（1d）

**做什么**

- 改 `scripts/flutter-build-from-publish.sh`：build 前调用 `flutter-sync-pubspec-from-manifest.py --spec ...`
- 改 `backend/app/services/apk_builder.py`：queue spec 写入 `flutter_pkgs`（已有则透传）
- 新增 `scripts/flutter-build-from-manifest.sh`（不经过 queue，CI 用）

**接口**

```bash
# CI / 本地
bash scripts/flutter-build-from-manifest.sh \
  --keys chat_qa,approval_flow \
  --app-name "测试" \
  --public-id parity-test-001

# 与 publish 一致
bash scripts/flutter-build-from-publish.sh <public_id>
```

**验收**

```bash
# 两种 keys 构建，对比 pubspec 差异
diff <(python scripts/flutter-sync-pubspec-from-manifest.py --keys chat_qa --dry-run) \
     <(python scripts/flutter-sync-pubspec-from-manifest.py --keys chat_qa,approval_flow,kb_document --dry-run)
# 应不同

CAPABILITY_KEYS=chat_qa bash scripts/flutter-build-apk.sh
# APK 仅 chat 菜单（现有行为保持）
```

---

### P1-4 · 完善已有 4 包（1d）

| 包 | 动作 |
|----|------|
| `capability_chat_qa` | 覆盖 chat_summary / chat_voice 路由别名 |
| `capability_approval_flow` | inbox + form/list widget 分支 |
| `capability_audit_log` | 接 `/audit/logs` API，去 mock |
| `capability_shanghai_voice` | 页面从 runtime-app 迁入包内，去掉 registry 桥接 |

**验收**

```bash
cd runtime-app && flutter analyze
melos exec --scope="capability_*" -- flutter analyze
```

---

### P1-5 · `capability_kb`（2d）

- 从 runtime-app 抽离 KB 相关 UI（若无则新建，对齐 `web-capability-kb`）
- `KbModule implements CapabilityModule`
- 依赖：`file_picker`（registry 已有）

**验收**：publish `{kb_document, chat_qa}` → App 有知识库 Tab + 上传入口。

---

### P1-6 · `capability_dashboard`（2d）

- 迁入 `report_page.dart` → 包内
- 覆盖 chart_dashboard / chart_funnel / notify_inapp / notify_email widget 映射

---

### P1-7 · `capability_data_nl_query`（1.5d）

- 迁入 `nl_query_page.dart`
- 对齐 Web `NLQueryWidget` API

---

### P1-8 · `capability_integration`（2.5d）

- 迁入 `integration_hub_page.dart`
- 按 `capabilityKey` 分入口（erp/meeting/helpdesk/asset/im/rbac）
- P1 可保留「连接器配置 UI + apiFetch 占位」，但**结构**必须在包内

---

### P1-9 · `capability_multi_agent` + `capability_security_mask`（2d）

- multi_agent：可先复用 chat 壳 + agent 切换条
- security_mask：迁入 `security_mask_page.dart`

---

### P1-10 · Registry 收口（1d）

- `capability_page_registry.dart` 仅保留 `buildMelosCapabilityPage` + fallback
- 删除 runtime-app 内已迁走的 page 实现（保留 re-export 一层兼容）
- `melos_capability_registry.dart` 改 codegen 输出

---

### P1-11 · batch7 验收脚本（1d）

**新增** `scripts/batch7-verify.sh`：

```bash
bash blockhub.sh batch7 [BASE_URL]
```

步骤：

1. `flutter-parity` ≥ 10/10 ok
2. `codegen-capability-manifest.py`
3. `flutter-sync-pubspec-from-manifest.py --keys chat_qa` + `flutter pub get`
4. `flutter analyze`（runtime-app + 全部 capability_*）
5. 可选：`SKIP_APK=1` 下双 profile dry-run pubspec diff

**blockhub.sh** 增加 `batch7` / `flutter-parity` / `flutter-sync-pubspec`

---

## 脚本接口总览

| 命令 | 用途 |
|------|------|
| `bash blockhub.sh flutter-parity` | 矩阵报告 HTML |
| `python scripts/flutter-sync-pubspec-from-manifest.py --keys ...` | 同步 pubspec + registry |
| `bash scripts/flutter-build-from-manifest.sh --keys ...` | 不经过 queue 的 APK 构建 |
| `bash blockhub.sh batch7` | P1 全量验收 |

---

## 风险 & 依赖

| 风险 | 缓解 |
|------|------|
| pubspec 动态改写污染 git | 构建在临时目录或 `.build/` workspace；CI 不 commit pubspec |
| 50 个逻辑 flutter_pkg 名 vs 10 物理包 | `flutter-parity-matrix.json` 显式映射 |
| APK 构建时间 | P1 只减依赖数量；P2 deferred import 再减体积 |
| audit/integration API 未就绪 | P1 验收以「包存在 + 路由可达」为准；API 真接放 P3 |

---

## 完成定义（P1 Done）

- [ ] 10/10 业务 Web 包有对应 Flutter 物理包
- [ ] `flutter-sync-pubspec-from-manifest.py` 按 keys 改变 pubspec
- [ ] `flutter-build-from-publish.sh` 构建前自动 sync
- [ ] `bash blockhub.sh batch7` 全绿
- [ ] `bash blockhub.sh flutter-parity` 报告 ≥ 95%（10/10 业务包 ok）

---

## 与后续 P2 边界

| P1（本阶段） | P2（下一阶段） |
|--------------|----------------|
| pubspec 按 manifest **静态裁剪** | deferred import 运行时懒加载 |
| 菜单 + 依赖一致 | APK 体积对比 ≥30% 下降 |
| flavor 仍用现有 dart-define | flutter_flavorizr 独立包名 |
