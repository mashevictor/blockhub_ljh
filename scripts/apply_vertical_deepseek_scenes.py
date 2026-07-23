#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""将 DeepSeek 行业场景 JSON 落到 SSOT / vertical_ops kinds / registry / 双端骨架。"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.vertical_ops_catalog import VERTICAL_OPS, all_kind_keys  # noqa: E402

DS_DIR = ROOT / "scripts" / "_vertical_deepseek"

# 共享能力：不进 vertical_ops kinds
SHARED = {
    "chat_qa", "kb_document", "notify_im", "chart_dashboard", "data_nl_query",
    "erp_connector", "policy_qa", "chart_funnel", "site_patrol", "device_repair",
    "quality_inspect", "school_notice", "homework_qa", "class_schedule", "study_coach",
    "hire_onboard", "leave_request", "gov_service", "legal_case", "campaign_ops",
    "sales_lead", "deco_material", "mfg_oee", "material_issue", "maintenance_plan",
    "shift_attendance", "energy_carbon", "training_record",
}


def _slug(name: str, prefix: str) -> str:
    raw = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")[:18]
    if not raw:
        raw = "item"
    key = f"{prefix}_{raw}"
    return key[:40]


def _fields_from_scene(s: dict) -> list[tuple]:
    out: list[tuple] = []
    for f in s.get("fields") or []:
        key = str(f.get("key") or "").strip()
        label = str(f.get("label") or key).strip()
        if key not in {"title", "field_a", "field_b", "field_c", "field_d", "note"}:
            # map unknown to next slot
            continue
        optional = bool(f.get("optional")) or key == "note"
        if optional:
            out.append((key, label, True))
        else:
            out.append((key, label))
    if not any(x[0] == "title" for x in out):
        out.insert(0, ("title", "标题"))
    # ensure uniqueness
    seen = set()
    uniq = []
    for t in out:
        if t[0] in seen:
            continue
        seen.add(t[0])
        uniq.append(t)
    return uniq[:5]


def load_scenes(ind_key: str) -> list[dict]:
    p = DS_DIR / f"_{ind_key}_scenes_deepseek.json"
    if not p.exists():
        return []
    data = json.loads(p.read_text(encoding="utf-8"))
    return list(data.get("scenes") or [])


def write_scene_py(ind_key: str, ind_name: str, scenes: list[dict]) -> None:
    # dedupe by name
    seen: set[str] = set()
    uniq = []
    for s in scenes:
        n = str(s.get("name") or "").strip()
        if not n or n in seen:
            continue
        seen.add(n)
        uniq.append(s)
    body = (
        f'"""{ind_name} 场景 → 真能力 SSOT（DeepSeek 丰富）。"""\n\n'
        "from __future__ import annotations\n\n"
        f"SCENES: list[dict] = {json.dumps(uniq, ensure_ascii=False, indent=4)}\n\n"
        "SCENES_BY_NAME = {s['name']: s for s in SCENES}\n\n"
        f"def {ind_key}_pack_scenes() -> list[dict[str, str]]:\n"
        "    out: list[dict[str, str]] = []\n"
        "    for s in SCENES:\n"
        "        out.append({\n"
        "            'name': s['name'],\n"
        "            'category': s.get('category') or '',\n"
        "            'problem': s.get('problem') or '',\n"
        "            'pages': s.get('pages') or 'form+list',\n"
        "            'agent': s.get('capability_key') or 'chat_qa',\n"
        "            'standard': '✓',\n"
        "        })\n"
        "    return out\n\n"
        f"def enrich_{ind_key}_menu_plan_item(item: dict, name: str) -> dict:\n"
        "    row = SCENES_BY_NAME.get(name)\n"
        "    if not row:\n"
        "        return item\n"
        "    ck = str(row.get('capability_key') or '').strip()\n"
        "    if ck:\n"
        "        item['capability_key'] = ck\n"
        "    return item\n"
    )
    path = ROOT / "backend" / "app" / "data" / f"{ind_key}_scene_capabilities.py"
    path.write_text(body, encoding="utf-8")
    print("wrote", path.name, "scenes", len(uniq))


def expand_vertical_kinds(ind_key: str, scenes: list[dict]) -> None:
    if ind_key not in VERTICAL_OPS or ind_key == "mfg":
        return
    ind = VERTICAL_OPS[ind_key]
    kinds = ind["kinds"]
    prefix2 = {
        "edu": "edu", "energy": "en", "gov": "gov", "legal": "lg", "hr": "hr",
        "construction": "ct", "agriculture": "ag", "media": "md", "auto": "au", "marketing": "mk",
    }.get(ind_key, ind_key[:2])

    for s in scenes:
        ck = str(s.get("capability_key") or "").strip()
        pk = str(s.get("page_kind") or "")
        if ck in SHARED:
            continue
        if ck in kinds:
            # enrich fields if empty-ish
            if len(kinds[ck].get("fields") or []) < 2:
                kinds[ck]["fields"] = _fields_from_scene(s)
            # attach scene name
            names = [x[0] for x in kinds[ck].get("scenes") or []]
            if s["name"] not in names:
                kinds[ck].setdefault("scenes", []).append((s["name"], s.get("problem") or s["name"]))
            continue
        # new vertical kind
        if pk in {"chat_kb", "chart", "notify", "integration", "files"}:
            continue
        key = ck if re.match(r"^[a-z][a-z0-9_]{2,39}$", ck) and ck not in SHARED else _slug(s.get("default_category") or s["name"], prefix2)
        if key in SHARED or key in kinds:
            # map scene to existing
            if key in kinds:
                names = [x[0] for x in kinds[key].get("scenes") or []]
                if s["name"] not in names:
                    kinds[key].setdefault("scenes", []).append((s["name"], s.get("problem") or s["name"]))
            continue
        fields = _fields_from_scene(s)
        kinds[key] = {
            "name": str(s.get("form_headline") or s["name"])[:20],
            "category": str(s.get("category") or "业务"),
            "prefix": key[:2].upper(),
            "fields": fields,
            "done_action": "done",
            "done_label": "完成",
            "scenes": [(s["name"], s.get("problem") or s["name"])],
        }
        # rewrite scene capability to new key
        s["capability_key"] = key


def dump_catalog() -> None:
    """Rewrite vertical_ops_catalog.py from in-memory VERTICAL_OPS (after expand)."""
    # Keep as Python source via json for kinds — safer to patch kinds section by regenerating whole file from template
    path = ROOT / "backend" / "app" / "data" / "vertical_ops_catalog.py"
    # serialize VERTICAL_OPS with tuples as lists then convert in codegen
    serial = {}
    for ind_key, ind in VERTICAL_OPS.items():
        kinds = {}
        for k, meta in ind["kinds"].items():
            fields = []
            for f in meta["fields"]:
                fields.append(list(f))
            scenes = [list(x) for x in meta.get("scenes") or []]
            kinds[k] = {**meta, "fields": fields, "scenes": scenes}
        serial[ind_key] = {
            "name": ind["name"],
            "color": ind["color"],
            "web_pkg": ind["web_pkg"],
            "flutter_pkg": ind["flutter_pkg"],
            "kinds": kinds,
            "existing_scenes": ind.get("existing_scenes") or [],
        }
    blob = json.dumps(serial, ensure_ascii=False, indent=2)
    # convert list fields back to tuples in a loader
    py = f'''"""剩余行业 vertical_ops 能力目录（SSOT）— DeepSeek 丰富后自动更新。"""

from __future__ import annotations

from typing import Any
import json

_RAW = json.loads("""{blob.replace(chr(92), chr(92)+chr(92)).replace('"""', r'\\"""')}""")

def _norm_kinds(kinds: dict) -> dict:
    out = {{}}
    for k, meta in kinds.items():
        fields = []
        for f in meta.get("fields") or []:
            fields.append(tuple(f))
        scenes = [tuple(x) for x in (meta.get("scenes") or [])]
        out[k] = {{**meta, "fields": fields, "scenes": scenes}}
    return out

VERTICAL_OPS: dict[str, dict[str, Any]] = {{
    k: {{
        **v,
        "kinds": _norm_kinds(v.get("kinds") or {{}}),
    }}
    for k, v in _RAW.items()
}}


def all_kind_keys() -> list[str]:
    out: list[str] = []
    for ind in VERTICAL_OPS.values():
        out.extend(ind["kinds"].keys())
    return out


def kind_industry(kind: str) -> str | None:
    for ind_key, ind in VERTICAL_OPS.items():
        if kind in ind["kinds"]:
            return ind_key
    return None


def kind_meta(kind: str) -> dict[str, Any] | None:
    for ind in VERTICAL_OPS.values():
        if kind in ind["kinds"]:
            return ind["kinds"][kind]
    return None
'''
    # JSON inside triple quotes is fragile with Chinese — use separate json file instead
    json_path = ROOT / "backend" / "app" / "data" / "_vertical_ops_catalog.json"
    json_path.write_text(json.dumps(serial, ensure_ascii=False, indent=2), encoding="utf-8")
    py = '''"""剩余行业 vertical_ops 能力目录（SSOT）— DeepSeek 丰富后自动更新。"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_RAW = json.loads((Path(__file__).with_name("_vertical_ops_catalog.json")).read_text(encoding="utf-8"))


def _norm_kinds(kinds: dict) -> dict:
    out = {}
    for k, meta in kinds.items():
        fields = [tuple(f) for f in (meta.get("fields") or [])]
        scenes = [tuple(x) for x in (meta.get("scenes") or [])]
        out[k] = {**meta, "fields": fields, "scenes": scenes}
    return out


VERTICAL_OPS: dict[str, dict[str, Any]] = {
    k: {**v, "kinds": _norm_kinds(v.get("kinds") or {})}
    for k, v in _RAW.items()
}


def all_kind_keys() -> list[str]:
    out: list[str] = []
    for ind in VERTICAL_OPS.values():
        out.extend(ind["kinds"].keys())
    return out


def kind_industry(kind: str) -> str | None:
    for ind_key, ind in VERTICAL_OPS.items():
        if kind in ind["kinds"]:
            return ind_key
    return None


def kind_meta(kind: str) -> dict[str, Any] | None:
    for ind in VERTICAL_OPS.values():
        if kind in ind["kinds"]:
            return ind["kinds"][kind]
    return None
'''
    path.write_text(py, encoding="utf-8")
    print("wrote catalog json+py kinds", len(all_kind_keys()))


def patch_registry_new_kinds(before: set[str]) -> None:
    from app.data.vertical_ops_catalog import VERTICAL_OPS as VO, all_kind_keys as akk
    # reload
    import importlib
    import app.data.vertical_ops_catalog as voc

    importlib.reload(voc)
    new_keys = [k for k in voc.all_kind_keys() if k not in before]
    if not new_keys:
        print("no new kinds for registry")
        return
    reg = ROOT / "backend" / "app" / "data" / "capability_registry.py"
    text = reg.read_text(encoding="utf-8")
    lines = ["\n# --- vertical_ops deepseek new kinds ---"]
    for ind_key, ind in voc.VERTICAL_OPS.items():
        for kind, meta in ind["kinds"].items():
            if kind not in new_keys:
                continue
            if f'CapabilityDef("{kind}"' in text:
                continue
            widget = "".join(p.title() for p in kind.split("_")) + "Widget"
            route = "/" + kind.replace("_", "-")
            lines.append(
                f'    CapabilityDef("{kind}", "{meta["name"]}", "{ind["name"]}", "{widget}", "{kind}",\n'
                f'                    "capability_vertical", ("{meta["name"]}",),\n'
                f'                    web_pkg="@blockhub/web-capability-vertical-ops",\n'
                f'                    menu_icon="module", menu_label="{meta["name"]}", route="{route}"),'
            )
    if len(lines) == 1:
        print("registry already has all kinds")
        return
    marker = "\nINDUSTRY_HINTS"
    idx = text.find(marker)
    close = text.rfind("]", 0, idx)
    text = text[:close] + "\n".join(lines) + "\n" + text[close:]
    reg.write_text(text, encoding="utf-8")
    print("registry +", len(lines) - 1)


def main() -> None:
    before = set(all_kind_keys())
    industries = [
        "edu", "energy", "gov", "legal", "hr",
        "construction", "agriculture", "media", "auto", "marketing", "mfg",
    ]
    for ind_key in industries:
        scenes = load_scenes(ind_key)
        if not scenes:
            print("skip no json", ind_key)
            continue
        # merge existing SSOT names
        exist_path = ROOT / "backend" / "app" / "data" / f"{ind_key}_scene_capabilities.py"
        # expand kinds first (mutates scenes capability_key)
        if ind_key != "mfg":
            expand_vertical_kinds(ind_key, scenes)
        name = VERTICAL_OPS.get(ind_key, {}).get("name") or ind_key
        if ind_key == "mfg":
            name = "传统制造"
        write_scene_py(ind_key, name, scenes)

    dump_catalog()
    patch_registry_new_kinds(before)
    print("DONE apply")


if __name__ == "__main__":
    main()
