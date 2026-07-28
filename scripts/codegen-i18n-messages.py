#!/usr/bin/env python3
"""Generate shared/i18n/messages/{zh-CN,en-US}/{capability,hero}.gen.json.

SSOT:
  - capability names/categories ← capability_registry.CapabilityDef
  - hero labels/hints/prompts/flow ← hero_presets.HERO_PRESETS
Overlays (en only, lowest priority after Def.labels):
  - shared/i18n/seed/capability.en-US.json
  - shared/i18n/seed/hero.en-US.json          (label string or {label, ...})
  - shared/i18n/seed/hero-copy.en-US.json     ({hint, prompt, role, flow_lines})
  - shared/i18n/seed/category.en-US.json

Do not edit *.gen.json by hand — run this script (or check-i18n-drift.sh).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.capability_registry import ALL_CAPABILITIES  # noqa: E402
from app.data.hero_presets import HERO_PRESETS  # noqa: E402

I18N = ROOT / "shared" / "i18n"
MESSAGES = I18N / "messages"
SEED = I18N / "seed"
LOCALES = ("zh-CN", "en-US")
GEN_HEADER = {
    "_generated_by": "scripts/codegen-i18n-messages.py",
    "_do_not_edit": True,
}


def _load_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def _load_seed_strings(name: str) -> dict[str, str]:
    data = _load_json(SEED / name)
    return {k: v for k, v in data.items() if not str(k).startswith("_") and isinstance(v, str)}


def _load_seed_objects(name: str) -> dict[str, dict[str, Any]]:
    data = _load_json(SEED / name)
    out: dict[str, dict[str, Any]] = {}
    for k, v in data.items():
        if str(k).startswith("_"):
            continue
        if isinstance(v, dict):
            out[str(k)] = v
        elif isinstance(v, str):
            out[str(k)] = {"label": v}
    return out


def humanize_key(key: str) -> str:
    parts = re.split(r"[_\s]+", key.strip())
    return " ".join(p[:1].upper() + p[1:] for p in parts if p)


def _write_gen(locale: str, stem: str, payload: dict[str, str]) -> Path:
    out_dir = MESSAGES / locale
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{stem}.gen.json"
    body = {**GEN_HEADER, **dict(sorted(payload.items()))}
    path.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def gen_capability() -> tuple[dict[str, str], dict[str, str]]:
    seed_cap = _load_seed_strings("capability.en-US.json")
    seed_cat = _load_seed_strings("category.en-US.json")
    zh: dict[str, str] = {}
    en: dict[str, str] = {}
    for key in sorted(ALL_CAPABILITIES.keys()):
        cap = ALL_CAPABILITIES[key]
        labels = cap.resolved_labels()
        zh[f"cap.{key}.name"] = labels.get("zh-CN") or cap.name
        zh[f"cap.{key}.category"] = cap.category

        en_name = labels.get("en-US") or seed_cap.get(key) or humanize_key(key)
        en_cat = seed_cat.get(cap.category) or cap.category
        en[f"cap.{key}.name"] = en_name
        en[f"cap.{key}.category"] = en_cat
    return zh, en


def gen_hero() -> tuple[dict[str, str], dict[str, str]]:
    label_seed = _load_seed_objects("hero.en-US.json")
    copy_seed = _load_seed_objects("hero-copy.en-US.json")
    zh: dict[str, str] = {}
    en: dict[str, str] = {}
    for preset in HERO_PRESETS:
        pid = preset["id"]
        labels = preset.get("labels") or {"zh-CN": preset["label"]}
        zh_label = labels.get("zh-CN") or preset["label"]
        zh_hint = preset.get("hint") or ""
        zh_prompt = preset.get("prompt") or ""
        zh_role = preset.get("role") or ""
        zh_flows = list(preset.get("flow_lines") or [])

        zh[f"hero.{pid}.label"] = zh_label
        zh[f"hero.{pid}.hint"] = zh_hint
        zh[f"hero.{pid}.prompt"] = zh_prompt
        if zh_role:
            zh[f"hero.{pid}.role"] = zh_role
        for i, line in enumerate(zh_flows):
            zh[f"hero.{pid}.flow.{i}"] = line

        seed: dict[str, Any] = {}
        seed.update(label_seed.get(pid) or {})
        seed.update(copy_seed.get(pid) or {})
        en_label = (
            labels.get("en-US")
            or (seed.get("label") if isinstance(seed.get("label"), str) else None)
            or humanize_key(pid)
        )
        en[f"hero.{pid}.label"] = en_label
        en[f"hero.{pid}.hint"] = str(seed.get("hint") or zh_hint)
        en[f"hero.{pid}.prompt"] = str(seed.get("prompt") or zh_prompt)
        en_role = seed.get("role")
        if isinstance(en_role, str) and en_role:
            en[f"hero.{pid}.role"] = en_role
        elif zh_role:
            en[f"hero.{pid}.role"] = zh_role

        en_flows = seed.get("flow_lines")
        if not isinstance(en_flows, list) or not en_flows:
            en_flows = zh_flows
        for i, line in enumerate(en_flows):
            en[f"hero.{pid}.flow.{i}"] = str(line)

    # Key parity: ensure en has every zh key (and vice versa via same loop structure)
    for key in list(zh.keys()):
        if key not in en:
            en[key] = zh[key]
    for key in list(en.keys()):
        if key not in zh:
            # should not happen; keep parity
            zh[key] = en[key]
    return zh, en


def main() -> None:
    cap_zh, cap_en = gen_capability()
    hero_zh, hero_en = gen_hero()

    written = [
        _write_gen("zh-CN", "capability", cap_zh),
        _write_gen("en-US", "capability", cap_en),
        _write_gen("zh-CN", "hero", hero_zh),
        _write_gen("en-US", "hero", hero_en),
    ]
    for path in written:
        print(f"wrote {path.relative_to(ROOT)} ({len(json.loads(path.read_text(encoding='utf-8'))) - 2} keys)")


if __name__ == "__main__":
    main()
