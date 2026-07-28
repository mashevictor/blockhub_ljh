# 上海话语音 Agent · 部署与生成器文档

> **真项目交付（推荐）**：服务器执行  
> `bash scripts/ship-shanghai-project.sh`  
> 或 `bash scripts/deploy-shanghai-one.sh`  
> 清单见 `projects/shanghai-voice/project.json`。部署后打开「我的应用」可见「上海话语音助手」。

本文覆盖三件事：

1. 后端「上海话语音 Agent」的部署要点（ASR / LLM / TTS）。
2. 把 `runtime-app` 打包成 **APK**。
3. 用 `scripts/generate_voice_app.py` 为任意租户**生成网页 + 上海话 Flutter**。

---

## 0. 架构一览

```
浏览器 / Flutter App / 生成网页
        │  WebSocket (PCM 音频上行 + 文本/音频下行)
        ▼
nginx  (124.222.177.43)  →  /api/v1/voice/*   (Upgrade 头已配)
        ▼
backend (127.0.0.1:8001, systemd: blockhub-api)
        ├─ ASR  openapi.teleagi.cn  /aipaas/voice/v1/asr/fy      ✅ 已通
        ├─ LLM  DeepSeek (DEEPSEEK_*)                                ✅ 已通
        └─ TTS  openapi.teleagi.cn  /aipaas/voice/v1/tts/supernaturalrt
                                                                  ⚠️ 待开通
```

后端路由：

- `GET  /api/v1/voice/config` —— 前端/App 拉取 WS 地址与采样率。
- `GET  /api/v1/voice/status` —— 配置概览。
- `GET  /api/v1/voice/auth-probe` —— 仅验证 ASR 握手（诊断用）。
- `WS   /api/v1/voice/shanghai-agent` —— 语音会话主链路。

---

## 1. 后端部署要点

### 1.1 环境变量（写在 `backend/.env`，已被 .gitignore 忽略，不入库）

```dotenv
# 上海话语音（必填才有语音功能）
TELEAI_APP_ID=5cd711d1a8cb47cc8b2a415444e86086
TELEAI_APP_KEY=b3763bb5fca94c3da20a1e954b7e76f6

# CORS：生成的网页可能被托管到任意站点，需放开来源
#   “*” 表示允许任意来源（语音接口为公开接口、无需登录凭据，可放心放开）
#   若需收紧，改成逗号分隔的具体来源即可，例如：
#   CORS_ORIGINS=https://a.com,https://b.com
CORS_ORIGINS=*
```

> 改了 `backend/.env` 后必须重启后端（见 1.3），否则不生效。

### 1.2 当前接口状态（实测）

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| ASR 语音识别 | ✅ 正常 | `openapi.teleagi.cn` 握手 + `option` 返回 `code:10000` |
| LLM 文本生成 | ✅ 正常 | DeepSeek 流式按句返回 |
| TTS 语音合成 | ✅ 正常 | supernaturalrt 已开通；`test_teleai_roundtrip.py` 往返 EXIT=0 |

TTS 已验证通过：用 `backend/scripts/test_teleai_roundtrip.py` 做 TTS 合成→降采样 24k→16k→ASR 识别的往返，可稳定得到 `EXIT=0`（例如 TTS 文本「侬好，吾是上海话智能体，谢谢侬。」被 ASR 识回「侬好我是上海话智能体，谢谢侬」）。

> 历史备注（已解决）：最初该 AppID 在电信网关侧未授权 `supernaturalrt`，WebSocket 升级后秒收 `1002`；在天翼 AI 控制台为 `TELEAI_APP_ID` 开通「超自然语音合成」能力后恢复正常。后端对 TTS 失败仍保留**优雅降级**（仅文字回复 + 前端提示），无需改动。

### 1.3 后端改代码后的标准重启流程

```bash
cd /root/blockhub/backend
source .venv/bin/activate
# 若迁移了数据库模型（本次没有）：alembic upgrade head
sudo systemctl restart blockhub-api
curl -s 127.0.0.1:8001/api/v1/health      # 应返回 {"status":"ok",...}
curl -s 127.0.0.1:8001/api/v1/voice/config  # 应返回 ws_url 等
```

> 注意：`systemctl restart`（不是 `reload`）才能换掉旧 worker。

### 1.4 复跑 TTS 往返冒烟

```bash
cd /root/blockhub/backend && source .venv/bin/activate
PYTHONPATH=. python scripts/test_teleai_roundtrip.py
# 期望：TTS 合成出 PCM、降采样后喂回 ASR 识别出文本，最终 EXIT=0
```

若换成其它上海话 TTS 凭证，或 TTS 偶发不可用，Agent 会**优雅降级**：文字回复照常显示，仅语音播报静音，并在前端提示「语音合成(TTS)暂不可用，已显示文字回复（待开通）」。

---

## 2. 打包 Flutter APK（`runtime-app`）

### 2.1 工具链（本机已就绪）

- Flutter 3.41.6 stable
- Android SDK 35（`ANDROID_HOME=/root/Android`，build-tools 35.0.0）
- Java 17（`/usr/bin/java`）
- 所有 Android licenses 已接受

> 缺依赖时的安装要点：`sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"`，并 `flutter doctor --android-licenses` 接受许可。

### 2.2 修复过的依赖坑（已写入 `pubspec.yaml`）

`record` 不能停在 `^5.2.1`：它声明 `record_platform_interface: ^1.2.0`（新签名 `hasPermission(id, {request})`），但被解析到的 `record_linux 0.7.2` 实现的是旧签名（1 个参数），编译报 *"fewer named arguments than overridden method"*。`record 7.x` 又要 Dart ≥ 3.12（本机 3.11.4 装不了），故锁定到 **`record: ^6.0.0`**（解析到 `record 6.2.1` + `record_linux 1.3.1`，签名一致，且兼容 Dart 3.11）。

### 2.3 构建命令

```bash
cd /root/blockhub/runtime-app
export ANDROID_HOME=/root/Android
export HOME=/root
flutter pub get
flutter build apk --release
# 产物：build/app/outputs/flutter-apk/app-release.apk
```

默认后端地址已写死为 `http://124.222.177.43/api/v1`（见 `lib/config/app_branding.dart`，可用 `--dart-define=API_BASE_URL=...` 覆盖）。

---

## 3. 生成器：为任意租户产出「网页 + 上海话 Flutter」

脚本：`scripts/generate_voice_app.py`。后端统一复用同一个 `/voice/shanghai-agent`，**无需为每个租户单独部署语音服务**。

```bash
python3 scripts/generate_voice_app.py \
  --slug mytenant \
  --name "阿拉上海话" \
  --color "#E11D48" \
  --api  http://124.222.177.43/api/v1 \
  --out generated
```

参数：

| 参数 | 说明 |
| --- | --- |
| `--slug` | 租户标识（小写字母/数字/连字符，2–32 位），用于目录与 `/tenant/config?tenant=` |
| `--name` | 展示名称 |
| `--color` | 主题色 hex，如 `#E11D48` |
| `--api` | 后端 API 基址（默认指向公网 IP） |
| `--app-id` | Flutter applicationId（默认 `com.trackchat.runtime`） |
| `--out` | 输出根目录（默认 `generated`） |

### 3.1 产出物

```
generated/
├── README.md                       # 本租户的使用说明
├── web/<slug>/index.html          # 单文件、自包含的上海话网页客户端
└── flutter/<slug>/build_apk.sh   # 复用 runtime-app 模板，按品牌变量打专属 APK
```

**网页** `index.html`：

- 内嵌了 API 基址与品牌，托管到任意静态服务器（甚至本地 `file://` 双击打开）即可用。
- 也支持 `?api=https://其他主机/api/v1` 在运行时覆盖后端。
- 浏览器要求 **HTTPS 或 localhost / file://** 才授权麦克风；若挂在不加密的 http 非本地域名下，部分浏览器会禁用麦克风，请用 https 或本地打开。

**Flutter** `build_apk.sh`：

```bash
bash generated/flutter/<slug>/build_apk.sh
# 内部：flutter pub get && flutter build apk --release \
#   --dart-define=APP_NAME=... --dart-define=API_BASE_URL=... \
#   --dart-define=PRIMARY_COLOR=... --dart-define=TENANT_SLUG=<slug> ...
# 产物：runtime-app/build/app/outputs/flutter-apk/app-release.apk
```

### 3.2 模板来源

- 网页模板：`templates/shanghai-voice-web.html`（`__API_BASE__` / `__APP_NAME__` / `__PRIMARY_COLOR__` 三个占位符由生成器替换）。
- Flutter 模板：`runtime-app/`（参数化模板，靠 `--dart-define` 注入品牌，不复制源码）。

---

## 4. 一键冒烟检查

```bash
# 后端健康 + 语音配置
curl -s 127.0.0.1:8001/api/v1/health
curl -s 127.0.0.1:8001/api/v1/voice/config

# 公网 WebSocket 是否打通（应返回 {"type":"state",...}）
python3 - <<'PY'
import asyncio, json, websockets
async def m():
    async with websockets.connect("ws://124.222.177.43/api/v1/voice/shanghai-agent?session_id=t") as ws:
        print(await asyncio.wait_for(ws.recv(), 20))
asyncio.run(m())
PY

# TTS 是否可用（开通后应为 EXIT=0）
cd /root/blockhub/backend && source .venv/bin/activate
PYTHONPATH=. python scripts/test_teleai_roundtrip.py
```
