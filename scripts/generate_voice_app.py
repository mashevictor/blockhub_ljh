#!/usr/bin/env python3
"""上海话语音能力生成器。

给定一个「租户/品牌」，生成两份可直接使用的能力产物：
  1. 网页：out/web/<slug>/index.html
     —— 单文件、自包含，托管到任意静态服务器(甚至 file://)即可用，
        自动连接后端 /voice/shanghai-agent 完成 ASR+LLM+TTS。
  2. Flutter App 构建脚本：out/flutter/<slug>/build_apk.sh
     —— 复用仓库内 runtime-app 作为「参数化模板」，按品牌变量打出专属 APK。

后端统一走同一个 /voice/shanghai-agent，无需为每个租户单独部署语音服务。

用法：
  python scripts/generate_voice_app.py \
      --slug mytenant --name "阿拉上海话" --color "#E11D48" \
      --api https://your-host/api/v1 --out generated
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "templates" / "shanghai-voice-web.html"
RUNTIME_APP = ROOT / "runtime-app"

HEX_RE = re.compile(r"^#?[0-9A-Fa-f]{6}$")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,31}$")


def fail(msg: str) -> "NoReturn":
    print("错误：" + msg, file=sys.stderr)
    sys.exit(1)


def render_web(template: Path, *, api: str, name: str, color: str) -> str:
    text = template.read_text(encoding="utf-8")
    text = text.replace("__API_BASE__", api)
    text = text.replace("__APP_NAME__", name)
    text = text.replace("__PRIMARY_COLOR__", color if color.startswith("#") else "#" + color)
    return text


def write_build_script(out_dir: Path, *, slug: str, name: str, color: str, api: str, app_id: str) -> None:
    android_home = os.environ.get("ANDROID_HOME", "/root/Android")
    script = f"""#!/usr/bin/env bash
# 由 generate_voice_app.py 生成 —— 为「{name}」构建专属上海话语音 APK。
# 依赖：Flutter SDK + Android SDK(ANDROID_HOME)。
set -euo pipefail
cd "{RUNTIME_APP}"
export ANDROID_HOME="{android_home}"
export HOME="${{HOME:-/root}}"
flutter pub get
flutter build apk --release \\
  --dart-define=APP_NAME="{name}" \\
  --dart-define=APP_ID="{app_id}" \\
  --dart-define=TENANT_SLUG="{slug}" \\
  --dart-define=API_BASE_URL="{api}" \\
  --dart-define=PRIMARY_COLOR="{color if color.startswith('#') else '#'+color}"
echo
echo "APK 产物：runtime-app/build/app/outputs/flutter-apk/app-release.apk"
"""
    (out_dir / "build_apk.sh").write_text(script, encoding="utf-8")
    os.chmod(out_dir / "build_apk.sh", 0o755)


def write_readme(out_dir: Path, *, slug: str, name: str, api: str, web_dir: str, flutter_dir: str) -> None:
    md = f"""# {name} · 上海话语音能力

由 `scripts/generate_voice_app.py` 生成。后端统一为 `{api}` 的 `/voice/shanghai-agent`。

## 1. 网页（{name}）
产物目录：`{web_dir}/`

- 单文件 `index.html` 已内嵌 API 基址与品牌，托管到任意静态服务器即可。
- 也可用 `?api=https://其他主机/api/v1` 在运行时覆盖后端地址。
- 浏览器需 HTTPS 或 localhost/file 才能授权麦克风；若网页跑在 http 非 localhost，
  部分浏览器会禁用麦克风，请用 https 或本地打开。

## 2. Flutter App（{name}）
构建脚本：`{flutter_dir}/build_apk.sh`

```bash
bash {flutter_dir}/build_apk.sh
```

产物：`runtime-app/build/app/outputs/flutter-apk/app-release.apk`
（runtime-app 是参数化模板，按 APP_NAME / API_BASE_URL / PRIMARY_COLOR 等品牌变量打出专属 APK。）

## 备注
- ASR 已通；TTS 若后端尚未开通「超自然语音合成」能力，会优雅降级为「仅文字回复」。
- 重新生成其它租户：再跑一次 generate_voice_app.py 换 --slug / --name 即可。
"""
    (out_dir / "README.md").write_text(md, encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description="生成上海话语音能力的网页与 Flutter 构建脚本")
    ap.add_argument("--slug", required=True, help="租户标识(a-z0-9-)，用于目录与 tenant 配置")
    ap.add_argument("--name", required=True, help="展示名称，如 阿拉上海话")
    ap.add_argument("--color", default="#4338CA", help="主题色 hex，如 #E11D48")
    ap.add_argument("--api", default="http://101.32.209.251/api/v1", help="后端 API 基址")
    ap.add_argument("--app-id", default="com.trackchat.runtime", help="Flutter applicationId")
    ap.add_argument("--out", default="generated", help="输出根目录")
    args = ap.parse_args()

    if not SLUG_RE.match(args.slug):
        fail("--slug 仅允许小写字母/数字/连字符，且长度 2-32。")
    if not HEX_RE.match(args.color):
        fail("--color 需为 6 位 hex，如 #E11D48。")
    if not TEMPLATE.exists():
        fail(f"找不到网页模板：{TEMPLATE}")
    if not RUNTIME_APP.exists():
        fail(f"找不到 Flutter 模板目录：{RUNTIME_APP}")

    api = args.api.rstrip("/")
    color = args.color if args.color.startswith("#") else "#" + args.color

    root_out = Path(args.out)
    web_dir = root_out / "web" / args.slug
    flutter_dir = root_out / "flutter" / args.slug
    web_dir.mkdir(parents=True, exist_ok=True)
    flutter_dir.mkdir(parents=True, exist_ok=True)

    # 网页
    html = render_web(TEMPLATE, api=api, name=args.name, color=color)
    (web_dir / "index.html").write_text(html, encoding="utf-8")

    # Flutter 构建脚本
    write_build_script(flutter_dir, slug=args.slug, name=args.name, color=color, api=api, app_id=args.app_id)

    # 顶层说明
    write_readme(root_out, slug=args.slug, name=args.name, api=api,
                 web_dir=str(web_dir), flutter_dir=str(flutter_dir))

    print(f"✅ 已生成「{args.name}」({args.slug})")
    print(f"   网页     : {web_dir}/index.html")
    print(f"   Flutter : {flutter_dir}/build_apk.sh")
    print(f"   后端     : {api}/voice/shanghai-agent")
    print(f"   托管网页 : 把 index.html 放到任意静态服务器；或本地直接双击打开。")


if __name__ == "__main__":
    main()
