#!/usr/bin/env python3
"""Generate Flutter i18n assets from shared/i18n + web-capability locales (同源).

Outputs:
  1) shared/i18n/flutter/{zh_CN,en_US}.arb  — ARB mirror (underscore keys)
  2) packages/blockhub_flutter_core/assets/i18n/{zh-CN,en-US}.json
     — flat dotted keys identical to Web (BhL10n runtime)

Do NOT hand-edit generated files; edit SSOT then re-run.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MESSAGES = ROOT / "shared" / "i18n" / "messages"
FLUTTER_ARB_DIR = ROOT / "shared" / "i18n" / "flutter"
CORE_ASSETS = ROOT / "packages" / "blockhub_flutter_core" / "assets" / "i18n"

LOCALES = ("zh-CN", "en-US")
META_KEYS = {"$schema", "_comment", "_meta", "@@locale"}
SHELL_FILES = (
    "common.json",
    "errors.json",
    "home.json",
    "product.json",
    "admin.json",
    "runtime.json",
    "content.json",
    "capability.gen.json",
    "hero.gen.json",
    "industry.gen.json",
    "scene.gen.json",
)


def load_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def flatten(obj: dict, prefix: str = "") -> dict[str, str]:
    out: dict[str, str] = {}
    for k, v in obj.items():
        if k in META_KEYS:
            continue
        key = f"{prefix}.{k}" if prefix else str(k)
        if isinstance(v, dict):
            # nested trees (common/errors) OR already-flat dotted keys as values
            if all(isinstance(x, str) for x in v.values()) and any("." in str(x) for x in ()):
                out.update(flatten(v, key))
            elif all(isinstance(x, (str, dict)) for x in v.values()):
                # errors.json is nested under no root — keys like UNAUTHORIZED
                # common.json nested under nothing with keys submit/cancel
                # But capability.gen is already flat with dotted keys at top level
                if any(isinstance(x, dict) for x in v.values()):
                    out.update(flatten(v, key))
                else:
                    # leaf map: decide if top-level keys are already dotted
                    if "." in str(k) and prefix == "":
                        # shouldn't nest further if values are strings — handled below
                        pass
                    out.update(flatten(v, key))
            else:
                out.update(flatten(v, key))
        elif isinstance(v, str):
            # Already-flat gen files use dotted keys at top level
            if prefix == "" and "." in str(k):
                out[str(k)] = v
            elif prefix:
                out[key] = v
            else:
                # common.json / errors.json leaves need namespace prefix
                out[str(k)] = v
        # ignore non-strings
    return out


def flatten_message_file(path: Path, *, force_ns: str | None = None) -> dict[str, str]:
    raw = load_json(path)
    flat: dict[str, str] = {}
    for k, v in raw.items():
        if k in META_KEYS:
            continue
        if isinstance(v, dict):
            # nested namespace object e.g. { "submit": "提交" } under common — but our
            # common.json is already flat at top: { "submit": "..." } without nesting.
            # errors.json: { "UNAUTHORIZED": "..." }
            for sk, sv in v.items():
                if sk in META_KEYS or not isinstance(sv, str):
                    continue
                flat[f"{k}.{sk}"] = sv
        elif isinstance(v, str):
            if force_ns:
                flat[f"{force_ns}.{k}"] = v
            else:
                flat[str(k)] = v
    return flat


def load_shell(locale: str) -> dict[str, str]:
    base = MESSAGES / locale
    out: dict[str, str] = {}
    out.update(flatten_message_file(base / "common.json", force_ns="common"))
    out.update(flatten_message_file(base / "errors.json", force_ns="error"))
    out.update(flatten_message_file(base / "home.json", force_ns="home"))
    out.update(flatten_message_file(base / "product.json", force_ns="product"))
    out.update(flatten_message_file(base / "admin.json", force_ns="admin"))
    out.update(flatten_message_file(base / "runtime.json", force_ns="runtime"))
    out.update(flatten_message_file(base / "content.json", force_ns="content"))
    out.update(flatten_message_file(base / "capability.gen.json"))
    out.update(flatten_message_file(base / "hero.gen.json"))
    out.update(flatten_message_file(base / "industry.gen.json"))
    # scene.gen is large; Flutter packs can pull on demand later — include for parity with Web marketing shell
    out.update(flatten_message_file(base / "scene.gen.json"))
    return out


def load_package_locales(locale: str) -> dict[str, str]:
    out: dict[str, str] = {}
    pkgs = ROOT / "packages"
    for folder in sorted(pkgs.glob("web-capability-*")):
        path = folder / "src" / "locales" / f"{locale}.json"
        if not path.is_file():
            continue
        for k, v in load_json(path).items():
            if k in META_KEYS or not isinstance(v, str):
                continue
            out[str(k)] = v
    return out


def arb_id(key: str) -> str:
    """ARB identifiers cannot contain dots — use underscores."""
    s = re.sub(r"[^A-Za-z0-9_]", "_", key.replace(".", "_").replace("-", "_"))
    if s and s[0].isdigit():
        s = f"k_{s}"
    return s


def to_arb(locale: str, flat: dict[str, str]) -> dict:
    arb_locale = locale.replace("-", "_")
    arb: dict = {"@@locale": arb_locale}
    for key in sorted(flat.keys()):
        aid = arb_id(key)
        arb[aid] = flat[key]
        arb[f"@{aid}"] = {
            "description": key,
            "x-blockhub-key": key,
        }
    return arb


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    FLUTTER_ARB_DIR.mkdir(parents=True, exist_ok=True)
    CORE_ASSETS.mkdir(parents=True, exist_ok=True)

    for locale in LOCALES:
        shell = load_shell(locale)
        pkgs = load_package_locales(locale)
        # package locales override shell for same key (widget copy wins)
        merged = {**shell, **pkgs}
        # runtime JSON — dotted keys, same as Web
        write_json(CORE_ASSETS / f"{locale}.json", merged)
        # ARB mirror
        arb_name = locale.replace("-", "_") + ".arb"
        write_json(FLUTTER_ARB_DIR / arb_name, to_arb(locale, merged))
        print(f"OK  {locale}: {len(merged)} keys → assets + ARB")

    # README for generated ARB dir
    readme = FLUTTER_ARB_DIR / "README.md"
    if not readme.is_file():
        readme.write_text(
            "# Flutter ARB (generated)\n\n"
            "Generated by `scripts/codegen-flutter-arb.py` from "
            "`shared/i18n/messages` + `packages/web-capability-*/src/locales`.\n\n"
            "Runtime loads `packages/blockhub_flutter_core/assets/i18n/*.json` "
            "via `BhL10n` (same dotted keys as Web). Do not hand-edit.\n",
            encoding="utf-8",
        )

    print("OK codegen-flutter-arb")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
