#!/usr/bin/env python3
"""Scaffold locales/ for every web-capability-* package (P6).

- Creates zh-CN.json / en-US.json + index.ts when missing
- Seeds cap.{key}.ui.ready placeholders from capability.gen (name)
- Ensures src/index.ts imports './locales'
- Does NOT overwrite existing locale keys
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from i18n_owners import build_web_owner_map, list_web_capability_folders  # noqa: E402

LOCALES_INDEX = """import { contributeI18nMessages } from '@blockhub/i18n'
import zh from './zh-CN.json'
import en from './en-US.json'

contributeI18nMessages({
  'zh-CN': zh,
  'en-US': en,
})
"""


def load_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def ensure_locales_import(index_ts: Path) -> bool:
    if not index_ts.is_file():
        return False
    text = index_ts.read_text(encoding="utf-8")
    if "./locales" in text or "locales/index" in text:
        return False
    # insert after first import block or at top
    if text.lstrip().startswith("import"):
        lines = text.splitlines(keepends=True)
        insert_at = 0
        for i, line in enumerate(lines):
            if line.startswith("import ") or line.startswith("import{"):
                insert_at = i + 1
                continue
            if insert_at and line.strip() == "":
                insert_at = i + 1
                continue
            break
        lines.insert(insert_at, "import './locales'\n")
        index_ts.write_text("".join(lines), encoding="utf-8")
    else:
        index_ts.write_text(f"import './locales'\n{text}", encoding="utf-8")
    return True


def seed_for_keys(keys: set[str], locale: str, gen: dict[str, str]) -> dict[str, str]:
    """Minimal seeds so empty packages still contribute display names."""
    out: dict[str, str] = {}
    for key in sorted(keys):
        name_key = f"cap.{key}.name"
        if name_key in gen:
            # Prefer package-local ui.title pointing at same text for widgets to adopt
            title_key = f"cap.{key}.ui.title"
            out[title_key] = gen[name_key]
    return out


def main() -> int:
    owners = build_web_owner_map()
    gen_zh = {
        k: v
        for k, v in load_json(ROOT / "shared/i18n/messages/zh-CN/capability.gen.json").items()
        if isinstance(v, str) and not str(k).startswith("_")
    }
    gen_en = {
        k: v
        for k, v in load_json(ROOT / "shared/i18n/messages/en-US/capability.gen.json").items()
        if isinstance(v, str) and not str(k).startswith("_")
    }

    created = 0
    wired = 0
    for folder in list_web_capability_folders():
        name = folder.name
        owned = owners.get(name, set())
        loc_dir = folder / "src" / "locales"
        zh_path = loc_dir / "zh-CN.json"
        en_path = loc_dir / "en-US.json"
        idx_path = loc_dir / "index.ts"

        zh_existing = {
            k: v for k, v in load_json(zh_path).items() if isinstance(v, str) and not str(k).startswith("_")
        }
        en_existing = {
            k: v for k, v in load_json(en_path).items() if isinstance(v, str) and not str(k).startswith("_")
        }

        zh_seed = seed_for_keys(owned, "zh-CN", gen_zh)
        en_seed = seed_for_keys(owned, "en-US", gen_en)
        zh = {**zh_seed, **zh_existing}
        en = {**en_seed, **en_existing}

        # key parity: ensure en has every zh key
        for k, v in zh.items():
            if k not in en:
                en[k] = en_seed.get(k) or gen_en.get(k.replace(".ui.title", ".name"), v)
        for k, v in list(en.items()):
            if k not in zh:
                zh[k] = zh_seed.get(k) or gen_zh.get(k.replace(".ui.title", ".name"), v)

        write_json(zh_path, dict(sorted(zh.items())))
        write_json(en_path, dict(sorted(en.items())))
        if not idx_path.is_file():
            idx_path.write_text(LOCALES_INDEX, encoding="utf-8")
            created += 1
        elif "contributeI18nMessages" not in idx_path.read_text(encoding="utf-8"):
            idx_path.write_text(LOCALES_INDEX, encoding="utf-8")
            created += 1

        if ensure_locales_import(folder / "src" / "index.ts"):
            wired += 1
            print(f"wired import  {name}")
        else:
            print(f"ok            {name}: {len(zh)} keys, owned={sorted(owned)[:3]}")

    print(f"OK scaffold: {created} locale index(es), {wired} index.ts import(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
