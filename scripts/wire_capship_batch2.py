# -*- coding: utf-8 -*-
"""Wire CapShip batch1 + study_coach into registry/seed/hero/match/main/parity."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BATCH = [
    {
        "key": "wedding_plan",
        "slug": "wedding-plan",
        "name": "婚礼筹备",
        "cat": "生活服务",
        "widget": "WeddingPlanWidget",
        "aliases": ("婚礼筹备", "宾客名单", "供应商协同", "婚礼预算", "婚庆"),
        "color": "#e879f9",
        "scene": "s25",
        "role": "新人",
        "hint": "生活 · 庆典",
        "prompt": "宾客名单、供应商协同与预算跟踪。",
        "flow": [
            ">> 婚礼筹备 · 宾客供应商登记",
            ">> 预算确认 · 进度闭环",
            ">> 企微钉钉飞书 · 协同提醒",
            ">> CapShip · 双端真接口",
        ],
        "icon": "💒",
        "menu_icon": "approval",
    },
    {
        "key": "deco_material",
        "slug": "deco-material",
        "name": "装修选材",
        "cat": "建筑工程",
        "widget": "DecoMaterialWidget",
        "aliases": ("装修选材", "材料选型", "进度验收", "家装预算", "装修"),
        "color": "#ca8a04",
        "scene": "s26",
        "role": "业主",
        "hint": "生活 · 家装",
        "prompt": "材料选型、进度验收与预算审批。",
        "flow": [
            ">> 装修选材 · 材料部位登记",
            ">> 进度验收 · 闭环完成",
            ">> 企微钉钉飞书 · 验收提醒",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🛠️",
        "menu_icon": "approval",
    },
    {
        "key": "pet_clinic",
        "slug": "pet-clinic",
        "name": "宠物问诊",
        "cat": "医疗健康",
        "widget": "PetClinicWidget",
        "aliases": ("宠物问诊", "宠物健康", "预约就诊", "疫苗提醒", "宠物"),
        "color": "#f472b6",
        "scene": "s27",
        "role": "宠主",
        "hint": "生活 · 宠物",
        "prompt": "宠物健康问答、预约就诊与疫苗提醒。",
        "flow": [
            ">> 宠物问诊 · 症状登记",
            ">> 就诊/疫苗 · 预约闭环",
            ">> 企微钉钉飞书 · 提醒推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🐾",
        "menu_icon": "chat",
    },
    {
        "key": "gov_service",
        "slug": "gov-service",
        "name": "政务办事",
        "cat": "政务公用",
        "widget": "GovServiceWidget",
        "aliases": ("政务办事", "办事指南", "诉求提交", "进度查询", "政务"),
        "color": "#475569",
        "scene": "s29",
        "role": "市民",
        "hint": "政务 · 便民",
        "prompt": "办事指南、诉求提交与进度查询。",
        "flow": [
            ">> 政务办事 · 事项诉求登记",
            ">> 办理进度 · 办结闭环",
            ">> 企微钉钉飞书 · 进度推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🏛️",
        "menu_icon": "kb",
    },
    {
        "key": "legal_case",
        "slug": "legal-case",
        "name": "法务合同",
        "cat": "法律服务",
        "widget": "LegalCaseWidget",
        "aliases": ("法务合同", "合同审查", "法规检索", "案件跟踪", "法务"),
        "color": "#334155",
        "scene": "s30",
        "role": "法务",
        "hint": "法务 · 合规",
        "prompt": "合同审查、法规检索与案件跟踪。",
        "flow": [
            ">> 法务合同 · 审查案件登记",
            ">> 节点跟进 · 闭环完成",
            ">> 企微钉钉飞书 · 节点提醒",
            ">> CapShip · 双端真接口",
        ],
        "icon": "⚖️",
        "menu_icon": "kb",
    },
]

KEYS = [c["key"] for c in BATCH]


def patch_main() -> None:
    path = ROOT / "backend/app/main.py"
    text = path.read_text(encoding="utf-8")
    for key in KEYS:
        if f"    {key}," not in text:
            text = text.replace("    travel_plan,\n", f"    travel_plan,\n    {key},\n")
        router_line = f"app.include_router({key}.router, prefix=settings.api_prefix, dependencies=_auth)\n"
        if router_line not in text:
            text = text.replace(
                "app.include_router(travel_plan.router, prefix=settings.api_prefix, dependencies=_auth)\n",
                "app.include_router(travel_plan.router, prefix=settings.api_prefix, dependencies=_auth)\n" + router_line,
            )
    path.write_text(text, encoding="utf-8")
    print("patched main")


def patch_registry() -> None:
    path = ROOT / "backend/app/data/capability_registry.py"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if f'CapabilityDef("{c["key"]}"' in text:
            continue
        alias = ", ".join(f'"{a}"' for a in c["aliases"])
        block = (
            f'    CapabilityDef("{c["key"]}", "{c["name"]}", "{c["cat"]}", "{c["widget"]}", "{c["key"]}",\n'
            f'                    "", ({alias}),\n'
            f'                    web_pkg="@blockhub/web-capability-{c["slug"]}",\n'
            f'                    menu_icon="{c["menu_icon"]}", menu_label="{c["name"]}", route="/{c["slug"]}"),\n'
        )
        text = text.replace(
            '    CapabilityDef("travel_plan",',
            block + '    CapabilityDef("travel_plan",',
        )
    path.write_text(text, encoding="utf-8")
    print("patched registry")


def patch_seed() -> None:
    path = ROOT / "backend/app/data/seed.py"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if f'"id": "{c["key"]}"' in text:
            continue
        agent = f'''    {{
        "id": "{c["key"]}",
        "name": "{c["name"]}",
        "icon": "{c["icon"]}",
        "color": "{c["color"]}",
        "status": "active",
        "description": "{c["prompt"]}",
        "pipeline": "登记→跟进→完成",
        "capabilities": ["{c["key"]}", "notify_im"],
        "office_count": 0,
        "industry_count": 3,
    }},
'''
        text = text.replace(
            '        "id": "travel_plan",',
            agent + '        "id": "travel_plan",',
        )
        cap = (
            f'    {{"key": "{c["key"]}", "name": "{c["name"]}", "category": "{c["cat"]}", '
            f'"widget": "{c["widget"]}", "agent_id": "{c["key"]}"}},\n'
        )
        if f'"key": "{c["key"]}"' not in text:
            text = text.replace(
                '    {"key": "travel_plan"',
                cap + '    {"key": "travel_plan"',
            )
    path.write_text(text, encoding="utf-8")
    print("patched seed")


def patch_hero_presets() -> None:
    path = ROOT / "backend/app/data/hero_presets.py"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        sid = c["scene"]
        # replace simple _preset block for that id
        pattern = rf'_preset\("{sid}",.*?(?=    _preset\(|\n\])'
        flow = ", ".join(f'"{x}"' for x in c["flow"])
        picks = (
            f'[{{"type": "industry", "key": "office", "label": "通用办公"}}, '
            f'{{"type": "scenario", "key": "{sid}-main", "label": "{c["name"]}"}}, '
            f'{{"type": "module", "key": "{c["key"]}", "label": "{c["name"]}"}}, '
            f'{{"type": "module", "key": "notify_im", "label": "企微钉钉飞书"}}]'
        )
        industry = {
            "s25": ("office", "通用办公"),
            "s26": ("construction", "建筑工程"),
            "s27": ("med", "医疗健康"),
            "s29": ("gov", "政务公用"),
            "s30": ("legal", "法律服务"),
        }[sid]
        picks = (
            f'[{{"type": "industry", "key": "{industry[0]}", "label": "{industry[1]}"}}, '
            f'{{"type": "scenario", "key": "{sid}-main", "label": "{c["name"]}"}}, '
            f'{{"type": "module", "key": "{c["key"]}", "label": "{c["name"]}"}}, '
            f'{{"type": "module", "key": "notify_im", "label": "企微钉钉飞书"}}]'
        )
        new_preset = (
            f'_preset("{sid}", "{c["name"]}", "{c["hint"]}", "{c["color"]}", "{c["prompt"]}",\n'
            f"            {picks},\n"
            f"            [{flow}],\n"
            f'            role="{c["role"]}"),\n'
        )
        m = re.search(rf'    _preset\("{sid}",[\s\S]*?role="[^"]*"\),', text)
        if not m:
            m = re.search(rf'    _preset\("{sid}",[\s\S]*?\),', text)
        if m:
            text = text[: m.start()] + "    " + new_preset + text[m.end() :]
        else:
            print("warn: no preset", sid)
    path.write_text(text, encoding="utf-8")
    print("patched hero_presets")


def patch_role_presets() -> None:
    path = ROOT / "home/src/data/rolePresets.ts"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        sid = c["scene"]
        industry = {
            "s25": ("office", "通用办公"),
            "s26": ("construction", "建筑工程"),
            "s27": ("med", "医疗健康"),
            "s29": ("gov", "政务公用"),
            "s30": ("legal", "法律服务"),
        }[sid]
        flow = ", ".join(f"'{x}'" for x in c["flow"])
        new_scene = f"""  scene('{sid}', '{c["name"]}', '{c["hint"]}', '{c["color"]}',
    '{c["prompt"]}',
    [
      {{ type: 'industry', key: '{industry[0]}', label: '{industry[1]}' }},
      {{ type: 'scenario', key: '{sid}-main', label: '{c["name"]}' }},
      {{ type: 'module', key: '{c["key"]}', label: '{c["name"]}' }},
      {{ type: 'module', key: 'notify_im', label: '企微钉钉飞书' }},
    ],
    [{flow}], '{c["role"]}'),
"""
        m = re.search(rf"  scene\('{sid}',[\s\S]*?\),", text)
        if m:
            text = text[: m.start()] + new_scene + text[m.end() :]
        else:
            print("warn role", sid)
    path.write_text(text, encoding="utf-8")
    print("patched rolePresets")


def patch_align_and_match() -> None:
    # heroAlign
    path = ROOT / "home/src/data/heroAlign.ts"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        sid = c["scene"]
        aliases = ", ".join(f"'{a}'" for a in c["aliases"][:6])
        line = f"  {sid}: [{aliases}],\n"
        if f"  {sid}:" not in text:
            text = text.replace("  s28:", line + "  s28:")
        else:
            text = re.sub(rf"  {sid}: \[[^\]]*\],\n", line, text)
        if f"'{c['key']}'" not in text:
            text = text.replace(
                "  'travel_plan',",
                f"  'travel_plan',\n  '{c['key']}',",
            )
    path.write_text(text, encoding="utf-8")

    path = ROOT / "backend/app/services/hero_preset_match.py"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        sid = c["scene"]
        aliases = ", ".join(f'"{a}"' for a in c["aliases"][:6])
        line = f'    "{sid}": ({aliases}),\n'
        if f'"{sid}":' not in text:
            text = text.replace('    "s28":', line + '    "s28":')
        else:
            text = re.sub(rf'    "{sid}": \([^)]*\),\n', line, text)
    path.write_text(text, encoding="utf-8")

    path = ROOT / "backend/app/services/keyword_match.py"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if f'"{c["key"]}": "{c["key"]}"' not in text:
            text = text.replace(
                '"travel_plan": "travel_plan",',
                f'"travel_plan": "travel_plan",\n    "{c["key"]}": "{c["key"]}",',
            )
    path.write_text(text, encoding="utf-8")

    for rel in [
        "backend/app/services/module_suggest.py",
        "backend/app/services/capability_resolver.py",
        "backend/app/services/intent_agent.py",
    ]:
        path = ROOT / rel
        text = path.read_text(encoding="utf-8")
        for c in BATCH:
            if c["key"] in text:
                continue
            if "module_suggest" in rel:
                text = text.replace('"travel_plan",', f'"travel_plan", "{c["key"]}",')
            elif "capability_resolver" in rel:
                text = text.replace('"travel_plan")', f'"travel_plan", "{c["key"]}")')
            elif "intent_agent" in rel:
                text = text.replace(
                    "旅行攻略→travel_plan",
                    f"旅行攻略→travel_plan，{c['name']}→{c['key']}",
                )
                if c["key"] not in text:
                    text = text.replace(
                        "课本学习/家默/学习进度→study_coach",
                        f"课本学习/家默/学习进度→study_coach，{c['name']}→{c['key']}",
                    )
        path.write_text(text, encoding="utf-8")
    print("patched match")


def patch_home_data() -> None:
    # scenarioPicks
    path = ROOT / "home/src/data/scenarioPicks.ts"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if f"key: '{c['key']}'" in text:
            continue
        line = (
            f"  {{ key: '{c['key']}', category: '{c['cat']}', icon: '{c['icon']}', title: '{c['name']}', "
            f"desc: '{c['prompt']}', capability: '{c['key']}', agent: '{c['role']}', promptLine: '{c['prompt']}' }},\n"
        )
        text = text.replace(
            "  { key: 'travel_plan'",
            line + "  { key: 'travel_plan'",
        )
        if f"key: '{c['key']}'" not in text:
            text = text.replace(
                "  { key: 'study_coach'",
                line + "  { key: 'study_coach'",
            )
    path.write_text(text, encoding="utf-8")

    path = ROOT / "home/src/data/constants.ts"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if f"key: '{c['key']}'" in text:
            continue
        line = f"    {{ key: '{c['key']}', name: '{c['name']}', icon: '{c['icon']}' }},\n"
        text = text.replace(
            "    { key: 'travel_plan'",
            line + "    { key: 'travel_plan'",
        )
        if f"key: '{c['key']}'" not in text:
            text = text.replace(
                "    { key: 'study_coach'",
                line + "    { key: 'study_coach'",
            )
    path.write_text(text, encoding="utf-8")

    path = ROOT / "home/src/data/iconPalette.ts"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if f"  {c['key']}:" in text:
            continue
        text = text.replace(
            "  travel_plan:",
            f"  {c['key']}: '{c['menu_icon']}',\n  travel_plan:",
        )
        if f"  {c['key']}:" not in text:
            text = text.replace(
                "  study_coach:",
                f"  {c['key']}: '{c['menu_icon']}',\n  study_coach:",
            )
    path.write_text(text, encoding="utf-8")

    path = ROOT / "home/src/data/publishDisplay.ts"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        aliases = ", ".join(f"'{a}'" for a in c["aliases"][:5])
        block = (
            f"  {{ match: [{aliases}], caps: [\n"
            f"    {{ key: '{c['key']}', label: '{c['name']}' }},\n"
            f"    {{ key: 'notify_im', label: '企微钉钉飞书' }},\n"
            f"  ]}},\n"
        )
        if f"key: '{c['key']}'" not in text:
            text = text.replace(
                "  { match: ['课本学习'",
                block + "  { match: ['课本学习'",
            )
            if f"key: '{c['key']}'" not in text:
                text = text.replace(
                    "  { match: ['课表查询'",
                    block + "  { match: ['课表查询'",
                )
    path.write_text(text, encoding="utf-8")

    cache = ROOT / "home/src/lib/heroPresetsCache.ts"
    t = cache.read_text(encoding="utf-8")
    t = t.replace("blockhub_hero_presets_v11", "blockhub_hero_presets_v12")
    t = t.replace("blockhub_hero_presets_v10", "blockhub_hero_presets_v12")
    t = t.replace("blockhub_hero_presets_v9", "blockhub_hero_presets_v12")
    cache.write_text(t, encoding="utf-8")
    print("patched home data")


def patch_parity() -> None:
    path = ROOT / "shared/flutter-parity-matrix.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data.get("rows") or data.get("packages") or data
    if isinstance(data, dict) and "rows" in data:
        container = data["rows"]
    elif isinstance(data, dict) and "packages" in data:
        container = data["packages"]
    elif isinstance(data, list):
        container = data
        data = {"rows": data}
    else:
        # find list
        for k, v in data.items():
            if isinstance(v, list):
                container = v
                break
        else:
            raise SystemExit("parity format unknown")

    existing = {r.get("flutter_pkg") for r in container if isinstance(r, dict)}
    for c in BATCH:
        pkg = f"capability_{c['key']}"
        if pkg in existing:
            continue
        mod = "".join(p.title() for p in c["key"].split("_")) + "Module"
        container.append(
            {
                "web_pkg": f"@blockhub/web-capability-{c['slug']}",
                "web_folder": f"web-capability-{c['slug']}",
                "flutter_pkg": pkg,
                "p1_scope": "app",
                "status_target": "ok",
                "capability_keys": [c["key"]],
                "module_class": mod,
                "dart_import": f"package:{pkg}/{pkg}.dart",
            }
        )
    path.write_text(json.dumps(data if isinstance(data, dict) else {"rows": container}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("patched parity")


def main() -> None:
    patch_main()
    patch_registry()
    patch_seed()
    patch_hero_presets()
    patch_role_presets()
    patch_align_and_match()
    patch_home_data()
    patch_parity()
    print("wire done")


if __name__ == "__main__":
    main()
