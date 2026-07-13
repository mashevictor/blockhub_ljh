# BlockHub 分批任务清单（GA 后 · v0.2.0-ga → v1.0）

> 更新：2026-07-13 · 代码侧批次 0–5 已收口 · 运维项待落地

---

## 一键联跑（服务器）

```bash
cd /root/blockhub && git pull
bash blockhub.sh sync-systemd          # 修复 APK 后台 bash PATH
bash blockhub.sh batch-all http://101.32.209.251 2>&1 | tee /tmp/batch-all.log
```

可选：`SKIP_BATCH2=1` 跳过 30 分钟 APK E2E；`SKIP_APK=1` 仅影响 batch0。

---

## 批次 0 · 基线确认

| # | 任务 | 状态 |
|---|------|------|
| 0.1–0.4 | pull / signoff / GA#9 / 归档 | 🔶 运维复验 |

`bash blockhub.sh batch0 http://101.32.209.251`

---

## 批次 1 · P1 生产正式化（运维为主）

| # | 任务 | 状态 |
|---|------|------|
| 1.1–1.2 | HTTPS / Nginx | ⬜ 运维 |
| 1.3 | JWT 轮换 | ⬜ WARN 可接受于 staging |
| 1.4–1.5 | pg-backup cron + health-watch | ✅ 脚本 · ⬜ crontab |
| 1.6–1.7 | 腾讯云 PG / COS | 跳过 |

`bash blockhub.sh batch1` · `INSTALL=1 bash scripts/setup-p1-cron.sh`

---

## 批次 2 · 发布→APK 全链路

| # | 任务 | 状态 |
|---|------|------|
| 2.1–2.4 | E2E / UI / batch2 / 文档 | ✅ |
| 2.5 | systemd PATH + `/bin/bash` | ✅ `cf2ab64` |

**必做**：`bash blockhub.sh sync-systemd` 后 `bash blockhub.sh batch2`

---

## 批次 3 · CI / E2E 门禁

| # | 任务 | 状态 |
|---|------|------|
| 3.1 | GitHub Secret `E2E_STAGING_BASE` | ⬜ 运维 |
| 3.2–3.5 | workflow / artifact / 文档 / batch3 | ✅ |

---

## 批次 4 · Flutter M10–M11

| # | 任务 | 状态 |
|---|------|------|
| 4.1–4.3 | Melos 骨架 / go_router / app.dart | ✅ |
| 4.4 | voice-only + dual-module  profile + GA#9 | ✅ batch4 含 E2E |

`bash blockhub.sh batch4 http://101.32.209.251`

---

## 批次 5 · Web 70%

| # | 任务 | 状态 |
|---|------|------|
| 5.1–5.4 | 覆盖率 / smoke / Flutter 页 / 降级 UX | ✅ |
| 5.5 | HTML 清单 | ✅ `web-coverage-report.html` |

`bash blockhub.sh batch5` · `bash blockhub.sh web-coverage`

---

## 批次 6 · P3（D31 / D32 / M10 深化）

| # | 任务 | 状态 |
|---|------|------|
| 6.1 | D32 chat SSE 10 VU 压测 | ✅ `load-chat-sse.sh` |
| 6.2 | D31 12 模板 × 12 行业 UI 检查 | ✅ `check-template-industry-ui.py` |
| 6.3 | M10 Melos 真拆包（core + 4 capability） | ✅ |
| 6.4 | batch6 联跑 | ✅ |

```bash
bash blockhub.sh batch6 http://101.32.209.251
bash blockhub.sh load-chat-sse http://101.32.209.251   # 仅 D32
bash blockhub.sh check-template-ui                    # 仅 D31
```

## 批次 7 · P1 Flutter Parity（进行中）

| # | 任务 | 状态 |
|---|------|------|
| 7.0 | parity 矩阵 + `flutter-sync-pubspec` | ✅ |
| 7.1～7.10 | 6 个新 capability 包迁入 | ✅ |
| 7.11 | registry 收口 + per-app 构建 | ✅ |

```bash
bash blockhub.sh batch7
bash blockhub.sh flutter-parity
python scripts/flutter-sync-pubspec-from-manifest.py --keys chat_qa,approval_flow --dry-run
```

详见 **`docs/P1-FLUTTER-PARITY-ISSUES.md`**

---

## 批次 8 · P2（deferred + flutter_tools）

| # | 任务 | 状态 |
|---|------|------|
| 8.1 | registry.g.dart 完整 codegen | ✅ |
| 8.2 | deferred import（voice/dashboard） | ✅ |
| 8.3 | capability_flutter_tools 13 stub | ✅ → batch9 真设备 |
| 8.4 | publish 构建后 pubspec 还原 | ✅ |
| 8.5 | apk-size-compare 脚本 | ✅ |

```bash
bash blockhub.sh batch8
bash blockhub.sh apk-size-compare
WITH_BUILD=1 bash blockhub.sh apk-size-compare   # 实际 APK 对比
```

## 批次 9+

详见 **`docs/ROADMAP-P2-P3.md`**

---

## 进度快照

| 批次 | 代码 | 服务器验收 |
|------|------|------------|
| 0 | ✅ | 🔶 |
| 1 | ✅ | 🔶 运维 |
| 2 | ✅ | 🔶 batch2 待绿 |
| 3 | ✅ | 🔶 Secret |
| 4 | ✅ | 🔶 batch4+GA9 |
| 5 | ✅ | 🔶 batch5 |
| 6 | ✅ | 🔶 batch6 待绿 |
| 7 | ✅ | 🔶 batch7 |
| 8 | ✅ | 🔶 batch8 |
| 9 | ✅ | 🔶 batch9 |
| 10+ | 📋 路线图 | — |

**最新修复**：`cf2ab64` APK 后台 `/bin/bash` · `02b401c` pg-backup / manifest codegen
