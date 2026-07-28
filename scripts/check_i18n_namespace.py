#!/usr/bin/env python3
"""CI: each web-capability-* package may only own its cap.{key}.* namespace."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from i18n_owners import (  # noqa: E402
    allowed_key_prefixes,
    build_web_owner_map,
    key_allowed,
    list_web_capability_folders,
)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main() -> int:
    owners = build_web_owner_map()
    failed = False
    missing_locales = []

    for folder in list_web_capability_folders():
        name = folder.name
        owned = owners.get(name, set())
        prefixes = allowed_key_prefixes(name, owned)
        loc = folder / "src" / "locales"
        zh = loc / "zh-CN.json"
        en = loc / "en-US.json"
        idx = loc / "index.ts"
        if not zh.is_file() or not en.is_file() or not idx.is_file():
            missing_locales.append(name)
            failed = True
            continue

        zh_keys = {k for k in load_json(zh) if not str(k).startswith("_")}
        en_keys = {k for k in load_json(en) if not str(k).startswith("_")}
        if zh_keys != en_keys:
            print(f"ERROR {name}: zh/en key mismatch {sorted(zh_keys ^ en_keys)[:8]}")
            failed = True

        for key in sorted(zh_keys | en_keys):
            if key.startswith("cap.") and not key_allowed(key, prefixes):
                print(f"ERROR {name}: foreign key '{key}' (owned={sorted(owned)})")
                failed = True

        pkg_index = folder / "src" / "index.ts"
        if pkg_index.is_file():
            text = pkg_index.read_text(encoding="utf-8")
            if "./locales" not in text and "locales/index" not in text:
                print(f"ERROR {name}: src/index.ts missing locales import")
                failed = True

    if missing_locales:
        print(f"ERROR missing locales for {len(missing_locales)} packages:")
        for n in missing_locales[:20]:
            print(f"  - {n}")
        print("  Run: python scripts/scaffold-capability-locales.py")

    if failed:
        print("check_i18n_namespace FAILED")
        return 1
    print(f"OK check_i18n_namespace ({len(list_web_capability_folders())} packages)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
