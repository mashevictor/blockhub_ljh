#!/usr/bin/env python3
"""P3 smoke: APP_MESSAGES has hero/cap keys; Top-5 package locales exist & key-parity."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOP = [
    "web-capability-leave-request",
    "web-capability-device-repair",
    "web-capability-expense-claim",
    "web-capability-member-loyalty",
    "web-capability-approval",
]


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    hero_en = load_json(ROOT / "shared/i18n/messages/en-US/hero.gen.json")
    assert hero_en.get("hero.s01.label") == "Leave Request", hero_en.get("hero.s01.label")
    cap_en = load_json(ROOT / "shared/i18n/messages/en-US/capability.gen.json")
    assert cap_en.get("cap.leave_request.name") == "Leave Request"

    failed = False
    for folder in TOP:
        zh_p = ROOT / "packages" / folder / "src/locales/zh-CN.json"
        en_p = ROOT / "packages" / folder / "src/locales/en-US.json"
        if not zh_p.is_file() or not en_p.is_file():
            print(f"ERROR: missing locales for {folder}")
            failed = True
            continue
        zh = {k: v for k, v in load_json(zh_p).items() if not str(k).startswith("_")}
        en = {k: v for k, v in load_json(en_p).items() if not str(k).startswith("_")}
        if set(zh) != set(en):
            print(f"ERROR: {folder} zh/en key mismatch: {sorted(set(zh) ^ set(en))[:12]}")
            failed = True
        else:
            print(f"OK  {folder}: {len(zh)} keys")

    # contribute entrypoints
    for folder in TOP:
        idx = ROOT / "packages" / folder / "src/locales/index.ts"
        pkg_idx = ROOT / "packages" / folder / "src/index.ts"
        text = pkg_idx.read_text(encoding="utf-8")
        if "./locales" not in text and "locales/index" not in text:
            print(f"ERROR: {folder}/src/index.ts does not import ./locales")
            failed = True
        if not idx.is_file():
            print(f"ERROR: missing {idx}")
            failed = True

    runtime_main = (ROOT / "runtime-web/src/main.tsx").read_text(encoding="utf-8")
    if "RuntimeI18nProvider" not in runtime_main:
        print("ERROR: runtime-web main missing RuntimeI18nProvider")
        failed = True
    else:
        print("OK  runtime-web I18nProvider")

    home_prov = (ROOT / "home/src/i18n/HomeI18nProvider.tsx").read_text(encoding="utf-8")
    if "APP_MESSAGES" not in home_prov:
        print("ERROR: HomeI18nProvider not using APP_MESSAGES")
        failed = True
    else:
        print("OK  home APP_MESSAGES")

    danmaku = (ROOT / "home/src/components/HeroDanmakuCloud.tsx").read_text(encoding="utf-8")
    if "hero.${preset.id}.label" not in danmaku and "hero.${" not in danmaku:
        # check template form
        if "hero." not in danmaku or "useTf" not in danmaku:
            print("ERROR: HeroDanmakuCloud not using hero.* i18n")
            failed = True
        else:
            print("OK  HeroDanmakuCloud hero.*")
    else:
        print("OK  HeroDanmakuCloud hero.*")

    oss = (ROOT / "home/src/data/capshipOss.ts").read_text(encoding="utf-8")
    if "hero.gen.json" not in oss:
        print("ERROR: capshipOss not reading hero.gen.json")
        failed = True
    else:
        print("OK  CapShip OSS uses hero.gen (not SSOT map alone)")

    if failed:
        print("smoke-i18n-p3 FAILED")
        return 1
    print("OK smoke-i18n-p3")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
