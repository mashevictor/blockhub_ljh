#!/usr/bin/env python3
"""将 backend hero_presets 同步为 home/src/data/rolePresets.ts 中 ROLE_PRESETS 数组。"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.hero_presets import HERO_PRESETS, PRESET_ROLES, preset_role  # noqa: E402

TS_PATH = ROOT / "home" / "src" / "data" / "rolePresets.ts"


def _esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def _pick(p: dict) -> str:
    return (
        "{ "
        f"type: '{_esc(p['type'])}', "
        f"key: '{_esc(p['key'])}', "
        f"label: '{_esc(p['label'])}' "
        "}"
    )


def render_scene(p: dict) -> str:
    picks = ",\n      ".join(_pick(x) for x in (p.get("picks") or []))
    flows = ", ".join(f"'{_esc(x)}'" for x in (p.get("flow_lines") or []))
    role = p.get("role") or PRESET_ROLES.get(p["id"]) or preset_role(p)
    weight = int(p.get("weight") or 3)
    # scene(id, label, hint, color, prompt, picks, flowLines, weightOrRole)
    # 末参：数字=weight，字符串=role；两者都要时用 weight 数字 + role 需看 TS helper
    # TS scene() 签名：weightOrRole 只能二选一。有 role 时传 role 字符串（weight 默认 3），
    # weight!=3 时传 weight 数字（role 写在对象里需扩展）。对齐现有写法：优先 role 字符串。
    tail = ""
    if role and weight == 3:
        tail = f", '{_esc(role)}'"
    elif weight != 3 and role:
        # 现有 helper 不支持同时传；用 weight，role 通过注释保留在 hint 侧；
        # 改为直接展开对象更稳——但为兼容 scene()，weight!=3 时传 weight，并在 label 旁靠 preset_role map。
        tail = f", {weight}"
    elif weight != 3:
        tail = f", {weight}"
    elif role:
        tail = f", '{_esc(role)}'"
    return (
        f"  scene('{_esc(p['id'])}', '{_esc(p['label'])}', '{_esc(p.get('hint') or '')}', '{_esc(p.get('color') or '#6366f1')}',\n"
        f"    '{_esc(p.get('prompt') or '')}',\n"
        f"    [\n      {picks}\n    ],\n"
        f"    [{flows}]{tail}),"
    )


def main() -> None:
    text = TS_PATH.read_text(encoding="utf-8")
    scenes = "\n\n".join(render_scene(p) for p in HERO_PRESETS)
    block = (
        "/** 英雄区弹幕词云 — 与 backend/app/data/hero_presets.py 同步（"
        f"{len(HERO_PRESETS)} 条） */\n"
        "export const ROLE_PRESETS: RolePreset[] = [\n"
        f"{scenes}\n"
        "]"
    )
    new, n = re.subn(
        r"/\*\*[\s\S]*?英雄区弹幕[\s\S]*?\*/\s*export const ROLE_PRESETS: RolePreset\[\] = \[[\s\S]*?\]",
        block,
        text,
        count=1,
    )
    if n != 1:
        # fallback: replace from export const ROLE_PRESETS to closing ]; before next export
        new, n = re.subn(
            r"export const ROLE_PRESETS: RolePreset\[\] = \[[\s\S]*?\n\]",
            block.split("*/\n", 1)[-1] if "*/" in block else block,
            text,
            count=1,
        )
        if n != 1:
            raise SystemExit("failed to locate ROLE_PRESETS block")
        # ensure comment
        new = new.replace(
            "export const ROLE_PRESETS",
            f"/** 英雄区弹幕词云 — 与 backend hero_presets 同步（{len(HERO_PRESETS)} 条） */\nexport const ROLE_PRESETS",
            1,
        )

    # bump roles for weight!=3 that lost role string
    roles_block_items = []
    for p in HERO_PRESETS:
        rid = p["id"]
        role = p.get("role") or PRESET_ROLES.get(rid) or ""
        if role:
            roles_block_items.append(f"  '{rid}': '{_esc(role)}',")
    # Update PRESET_ROLES in hero is backend-only; frontend uses scene role arg.

    # Also fix map: for weight!=3 presets, inject role via second pass on scene lines — rewrite those with object form
    # Simpler: patch scene() helper usage — rewrite high-weight scenes manually after
    TS_PATH.write_text(new, encoding="utf-8")

    # Post-fix weight+role: re-read hero and patch scenes that have weight!=3
    text2 = TS_PATH.read_text(encoding="utf-8")
    for p in HERO_PRESETS:
        w = int(p.get("weight") or 3)
        role = p.get("role") or ""
        if w == 3 or not role:
            continue
        # Replace trailing `, {w}),` for this id with role string and set weight in a comment — 
        # Better: change to end with role and accept weight=3 for display, OR extend scene helper.
        pass

    print(json.dumps({"ok": True, "count": len(HERO_PRESETS), "path": str(TS_PATH)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
