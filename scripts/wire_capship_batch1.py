# -*- coding: utf-8 -*-
"""Wire CapShip batch1 + study_coach into registry/seed/hero/match/main/parity."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BATCH = [
    {
        "key": "delivery_order",
        "slug": "delivery-order",
        "name": "外卖配送",
        "cat": "物流仓储",
        "widget": "DeliveryOrderWidget",
        "aliases": ("外卖配送", "外卖", "骑手调度", "配送异常", "订单跟踪", "运单跟踪"),
        "color": "#f43f5e",
        "scene": "s22",
        "role": "骑手",
        "hint": "生活 · 配送",
        "prompt": "订单跟踪、骑手调度与异常处理。",
        "flow": [
            ">> 外卖配送 · 取送信息登记",
            ">> 配送中/完成 · 状态闭环",
            ">> 企微钉钉飞书 · 异常推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🚚",
        "menu_icon": "approval",
    },
    {
        "key": "house_viewing",
        "slug": "house-viewing",
        "name": "看房签约",
        "cat": "房地产",
        "widget": "HouseViewingWidget",
        "aliases": ("看房签约", "看房预约", "意向登记", "签约跟进", "带看"),
        "color": "#b45309",
        "scene": "s20",
        "role": "销售",
        "hint": "房产 · 销售",
        "prompt": "看房预约、意向登记与签约跟进。",
        "flow": [
            ">> 看房签约 · 客户房源登记",
            ">> 意向/签约 · 跟进闭环",
            ">> 企微钉钉飞书 · 进度推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🏡",
        "menu_icon": "approval",
    },
    {
        "key": "campaign_ops",
        "slug": "campaign-ops",
        "name": "活动运营",
        "cat": "营销运营",
        "widget": "CampaignOpsWidget",
        "aliases": ("活动运营", "活动策划", "报名统计", "转化复盘", "活动管理"),
        "color": "#06b6d4",
        "scene": "s18",
        "role": "运营",
        "hint": "市场 · 活动",
        "prompt": "活动策划、报名统计与转化复盘。",
        "flow": [
            ">> 活动运营 · 排期素材登记",
            ">> 报名复盘 · 指标闭环",
            ">> 企微钉钉飞书 · 触达推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "📣",
        "menu_icon": "chart",
    },
    {
        "key": "fitness_checkin",
        "slug": "fitness-checkin",
        "name": "健身打卡",
        "cat": "生活服务",
        "widget": "FitnessCheckinWidget",
        "aliases": ("健身打卡", "课程预约", "训练打卡", "教练答疑", "健身"),
        "color": "#14b8a6",
        "scene": "s23",
        "role": "会员",
        "hint": "生活 · 健康",
        "prompt": "课程预约、训练打卡与教练答疑。",
        "flow": [
            ">> 健身打卡 · 课程预约登记",
            ">> 训练打卡 · 完成闭环",
            ">> 企微钉钉飞书 · 提醒推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "💪",
        "menu_icon": "chart",
    },
    {
        "key": "travel_plan",
        "slug": "travel-plan",
        "name": "旅行攻略",
        "cat": "生活服务",
        "widget": "TravelPlanWidget",
        "aliases": ("旅行攻略", "行程规划", "景点问答", "预订提醒", "旅行"),
        "color": "#0d9488",
        "scene": "s24",
        "role": "旅行",
        "hint": "生活 · 出行",
        "prompt": "行程规划、景点问答与预订提醒。",
        "flow": [
            ">> 旅行攻略 · 目的地行程登记",
            ">> 景点/预订 · 确认闭环",
            ">> 企微钉钉飞书 · 提醒推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🧳",
        "menu_icon": "chat",
    },
]

KEYS = [c["key"] for c in BATCH] + ["study_coach"]


def patch_main() -> None:
    path = ROOT / "backend/app/main.py"
    text = path.read_text(encoding="utf-8")
    for key in KEYS:
        if f"    {key}," not in text and f"\n    {key}," not in text:
            text = text.replace(
                "    study_coach,\n" if "study_coach" in KEYS and key != "study_coach" else "    hotel_booking,\n",
                f"    hotel_booking,\n    {key},\n" if key != "study_coach" else "    hotel_booking,\n    study_coach,\n",
            )
    # cleaner: ensure all imports
    import_block_keys = [
        "school_notice",
        "homework_qa",
        "property_repair",
        "site_patrol",
        "class_schedule",
        "hotel_booking",
        "study_coach",
        "delivery_order",
        "house_viewing",
        "campaign_ops",
        "fitness_checkin",
        "travel_plan",
    ]
    # rebuild imports section simply by insertion before notifications
    for key in ["delivery_order", "house_viewing", "campaign_ops", "fitness_checkin", "travel_plan"]:
        if f"    {key}," not in text:
            text = text.replace("    study_coach,\n", f"    study_coach,\n    {key},\n")
        router_line = f"app.include_router({key}.router, prefix=settings.api_prefix, dependencies=_auth)\n"
        if router_line not in text:
            text = text.replace(
                "app.include_router(study_coach.router, prefix=settings.api_prefix, dependencies=_auth)\n",
                "app.include_router(study_coach.router, prefix=settings.api_prefix, dependencies=_auth)\n" + router_line,
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
            '    CapabilityDef("hotel_booking",',
            block + '    CapabilityDef("hotel_booking",',
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
            '        "id": "hotel_booking",',
            agent + '        "id": "hotel_booking",',
        )
        cap = (
            f'    {{"key": "{c["key"]}", "name": "{c["name"]}", "category": "{c["cat"]}", '
            f'"widget": "{c["widget"]}", "agent_id": "{c["key"]}"}},\n'
        )
        if f'"key": "{c["key"]}"' not in text:
            text = text.replace(
                '    {"key": "hotel_booking"',
                cap + '    {"key": "hotel_booking"',
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
        # better industry key per scene
        industry = {
            "s22": ("logistics", "物流仓储"),
            "s20": ("realestate", "房地产"),
            "s18": ("marketing", "市场营销"),
            "s23": ("office", "通用办公"),
            "s24": ("office", "通用办公"),
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
            "s22": ("logistics", "物流仓储"),
            "s20": ("realestate", "房地产"),
            "s18": ("marketing", "市场营销"),
            "s23": ("office", "通用办公"),
            "s24": ("office", "通用办公"),
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
                "  'study_coach',",
                f"  'study_coach',\n  '{c['key']}',",
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
                '"study_coach": "study_coach",',
                f'"study_coach": "study_coach",\n    "{c["key"]}": "{c["key"]}",',
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
                text = text.replace('"study_coach",', f'"study_coach", "{c["key"]}",')
            elif "capability_resolver" in rel:
                text = text.replace('"study_coach")', f'"study_coach", "{c["key"]}")')
            elif "intent_agent" in rel:
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
            "  { key: 'study_coach'",
            line + "  { key: 'study_coach'",
        )
        if f"key: '{c['key']}'" not in text:
            text = text.replace(
                "  { key: 'class_schedule'",
                line + "  { key: 'class_schedule'",
            )
    path.write_text(text, encoding="utf-8")

    path = ROOT / "home/src/data/constants.ts"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if f"key: '{c['key']}'" in text:
            continue
        line = f"    {{ key: '{c['key']}', name: '{c['name']}', icon: '{c['icon']}' }},\n"
        text = text.replace(
            "    { key: 'study_coach'",
            line + "    { key: 'study_coach'",
        )
        if f"key: '{c['key']}'" not in text:
            text = text.replace(
                "    { key: 'class_schedule'",
                line + "    { key: 'class_schedule'",
            )
    path.write_text(text, encoding="utf-8")

    path = ROOT / "home/src/data/iconPalette.ts"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if f"  {c['key']}:" in text:
            continue
        text = text.replace(
            "  study_coach:",
            f"  {c['key']}: '{c['menu_icon']}',\n  study_coach:",
        )
        if f"  {c['key']}:" not in text:
            text = text.replace(
                "  class_schedule:",
                f"  {c['key']}: '{c['menu_icon']}',\n  class_schedule:",
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
    t = t.replace("blockhub_hero_presets_v10", "blockhub_hero_presets_v11")
    t = t.replace("blockhub_hero_presets_v9", "blockhub_hero_presets_v11")
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
