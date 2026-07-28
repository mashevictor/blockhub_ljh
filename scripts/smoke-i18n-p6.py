#!/usr/bin/env python3
"""P6 smoke: Flutter ARB 同源 + 全量 web locales + namespace + format helpers."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

TOP_FLUTTER = [
    "capability_leave_request",
    "capability_device_repair",
    "capability_expense_claim",
    "capability_member_loyalty",
    "capability_approval_flow",
]


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main() -> int:
    failed = False

    # 1) Flutter assets + ARB exist and share a sample key
    zh_asset = ROOT / "packages/blockhub_flutter_core/assets/i18n/zh-CN.json"
    en_asset = ROOT / "packages/blockhub_flutter_core/assets/i18n/en-US.json"
    arb_zh = ROOT / "shared/i18n/flutter/zh_CN.arb"
    arb_en = ROOT / "shared/i18n/flutter/en_US.arb"
    for p in (zh_asset, en_asset, arb_zh, arb_en):
        if not p.is_file():
            print(f"ERROR: missing {p.relative_to(ROOT)}")
            failed = True
    if zh_asset.is_file() and en_asset.is_file():
        zh = load_json(zh_asset)
        en = load_json(en_asset)
        if "common.submit" not in zh or "common.submit" not in en:
            print("ERROR: Flutter assets missing common.submit")
            failed = True
        else:
            print(f"OK  Flutter assets: {len(zh)} zh / {len(en)} en keys")
        if "cap.leave_request.title.leave" not in zh:
            print("ERROR: leave_request package locales not merged into Flutter assets")
            failed = True
        else:
            print("OK  package locales merged (leave_request)")

    if arb_zh.is_file():
        arb = load_json(arb_zh)
        if arb.get("@@locale") != "zh_CN":
            print("ERROR: ARB @@locale != zh_CN")
            failed = True
        else:
            print(f"OK  ARB zh_CN ({len([k for k in arb if not k.startswith('@')])} entries)")

    # 2) BhL10n + Gtgt use bhTf
    bh = (ROOT / "packages/blockhub_flutter_core/lib/src/bh_l10n.dart").read_text(encoding="utf-8")
    if "class BhL10n" not in bh or "formatDate" not in bh:
        print("ERROR: BhL10n missing or incomplete")
        failed = True
    else:
        print("OK  BhL10n")

    gtgt = (ROOT / "packages/blockhub_flutter_core/lib/src/gtgt_step_composer.dart").read_text(
        encoding="utf-8"
    )
    if "bhTf('common.confirm'" not in gtgt and 'bhTf("common.confirm"' not in gtgt:
        print("ERROR: Flutter GtgtStepComposer not using bhTf common.*")
        failed = True
    else:
        print("OK  Flutter GtgtStepComposer i18n")

    # 3) Top5 Flutter pages use bhTf
    for pkg in TOP_FLUTTER:
        dart_files = list((ROOT / "packages" / pkg / "lib").rglob("*.dart"))
        text = "\n".join(p.read_text(encoding="utf-8") for p in dart_files)
        if "bhTf(" not in text:
            print(f"ERROR: {pkg} not using bhTf")
            failed = True
        else:
            print(f"OK  {pkg} bhTf")

    # 4) runtime-app loads BhL10n
    main_dart = (ROOT / "runtime-app/lib/main.dart").read_text(encoding="utf-8")
    if "BhL10n.instance.load" not in main_dart:
        print("ERROR: runtime-app main missing BhL10n.load")
        failed = True
    else:
        print("OK  runtime-app BhL10n.load")

    # 5) namespace check script + all web packages have locales
    from i18n_owners import list_web_capability_folders

    missing = []
    for folder in list_web_capability_folders():
        loc = folder / "src" / "locales"
        if not (loc / "zh-CN.json").is_file() or not (loc / "en-US.json").is_file():
            missing.append(folder.name)
    if missing:
        print(f"ERROR: {len(missing)} web packages missing locales")
        failed = True
    else:
        print(f"OK  all {len(list_web_capability_folders())} web-capability packages have locales")

    # 6) format helpers
    fmt = (ROOT / "packages/i18n/src/format.ts").read_text(encoding="utf-8")
    if "formatDate" not in fmt or "formatNumber" not in fmt:
        print("ERROR: packages/i18n format helpers missing")
        failed = True
    else:
        print("OK  @blockhub/i18n formatDate/formatNumber")

    react = (ROOT / "packages/i18n/src/react.tsx").read_text(encoding="utf-8")
    if "useFormat" not in react:
        print("ERROR: useFormat hook missing")
        failed = True
    else:
        print("OK  useFormat hook")

    # 7) skill mentions A2/A3 i18n
    skill = (ROOT / ".cursor/skills/capship-capability/SKILL.md").read_text(encoding="utf-8")
    if "contributeI18nMessages" not in skill or "codegen-flutter-arb" not in skill:
        print("ERROR: capability skill missing P6 i18n checklist")
        failed = True
    else:
        print("OK  capability skill A2/A3/A4 i18n")

    # 8) namespace gate script exists (executed by check_i18n_drift / CI)
    if not (ROOT / "scripts/check_i18n_namespace.py").is_file():
        print("ERROR: check_i18n_namespace.py missing")
        failed = True
    else:
        print("OK  check_i18n_namespace.py present")

    if failed:
        print("smoke-i18n-p6 FAILED")
        return 1
    print("OK smoke-i18n-p6")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
