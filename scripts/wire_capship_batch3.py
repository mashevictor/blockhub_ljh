# -*- coding: utf-8 -*-
"""Wire CapShip office batch s01-s07 into registry/seed/hero/match/main/parity."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BATCH = [
    {
        "key": "leave_request",
        "slug": "leave-request",
        "name": "请假审批",
        "cat": "人事行政",
        "widget": "LeaveRequestWidget",
        "aliases": ("请假审批", "请假申请", "假期余额", "请假"),
        "color": "#8b5cf6",
        "scene": "s01",
        "role": "HR",
        "hint": "人事 · 流程",
        "prompt": "请假在线申请、主管审批与假期余额查询。",
        "flow": [
            ">> 请假审批 · 在线提单",
            ">> 主管批复 · 通过/驳回",
            ">> 企微钉钉飞书 · 结果推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "📅",
        "menu_icon": "approval",
        "industry": ("office", "通用办公"),
    },
    {
        "key": "expense_claim",
        "slug": "expense-claim",
        "name": "报销记账",
        "cat": "财务法务",
        "widget": "ExpenseClaimWidget",
        "aliases": ("报销记账", "费用报销", "发票上传", "报销申请"),
        "color": "#0284c7",
        "scene": "s02",
        "role": "财务",
        "hint": "财务 · 票据",
        "prompt": "费用报销拍照上传、财务审核与台账查询。",
        "flow": [
            ">> 报销记账 · 费用登记",
            ">> 财务审核 · 付款闭环",
            ">> 企微钉钉飞书 · 审核推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🧾",
        "menu_icon": "approval",
        "industry": ("office", "通用办公"),
    },
    {
        "key": "policy_qa",
        "slug": "policy-qa",
        "name": "制度问答",
        "cat": "知识协同",
        "widget": "PolicyQaWidget",
        "aliases": ("制度问答", "制度政策", "福利政策", "制度查询"),
        "color": "#6366f1",
        "scene": "s03",
        "role": "使用者",
        "hint": "知识 · 自助",
        "prompt": "公司制度、福利政策智能问答，随时自助查询。",
        "flow": [
            ">> 制度问答 · 提问入库",
            ">> 答复归档 · 知识闭环",
            ">> 企微钉钉飞书 · 答复推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "📘",
        "menu_icon": "kb",
        "industry": ("office", "通用办公"),
    },
    {
        "key": "hire_onboard",
        "slug": "hire-onboard",
        "name": "招聘入职",
        "cat": "人事行政",
        "widget": "HireOnboardWidget",
        "aliases": ("招聘入职", "招聘管理", "简历筛选", "入职指引"),
        "color": "#a855f7",
        "scene": "s04",
        "role": "HR",
        "hint": "HR · 人才",
        "prompt": "招聘发布、简历筛选与入职指引一站式。",
        "flow": [
            ">> 招聘入职 · 候选人登记",
            ">> 面试/Offer · 入职闭环",
            ">> 企微钉钉飞书 · 进度推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🧑‍💼",
        "menu_icon": "approval",
        "industry": ("office", "通用办公"),
    },
    {
        "key": "sales_lead",
        "slug": "sales-lead",
        "name": "销售线索",
        "cat": "销售行业",
        "widget": "SalesLeadWidget",
        "aliases": ("销售线索", "客户跟进", "线索录入", "销售漏斗"),
        "color": "#ef4444",
        "scene": "s05",
        "role": "销售",
        "hint": "CRM · 跟进",
        "prompt": "线索录入、客户跟进与销售漏斗管理。",
        "flow": [
            ">> 销售线索 · 客户登记",
            ">> 跟进成交 · 漏斗闭环",
            ">> 企微钉钉飞书 · 跟进提醒",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🔥",
        "menu_icon": "chart",
        "industry": ("sales", "销售行业"),
    },
    {
        "key": "quote_contract",
        "slug": "quote-contract",
        "name": "报价合同",
        "cat": "销售行业",
        "widget": "QuoteContractWidget",
        "aliases": ("报价合同", "报价审批", "合同评审", "特价申请"),
        "color": "#dc2626",
        "scene": "s06",
        "role": "销售",
        "hint": "销售 · 签单",
        "prompt": "报价审批、合同评审与特价申请。",
        "flow": [
            ">> 报价合同 · 单据登记",
            ">> 评审签约 · 闭环完成",
            ">> 企微钉钉飞书 · 审批推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "📝",
        "menu_icon": "approval",
        "industry": ("sales", "销售行业"),
    },
    {
        "key": "ops_kpi",
        "slug": "ops-kpi",
        "name": "经营看板",
        "cat": "数据报表",
        "widget": "OpsKpiWidget",
        "aliases": ("经营看板", "经营指标", "自然语言查数", "老板看板"),
        "color": "#f59e0b",
        "scene": "s07",
        "role": "老板",
        "hint": "老板 · 决策",
        "prompt": "核心经营指标一屏掌控，自然语言查数。",
        "flow": [
            ">> 经营看板 · 指标登记",
            ">> 发布预警 · 归档闭环",
            ">> 企微钉钉飞书 · 指标推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "📊",
        "menu_icon": "chart",
        "industry": ("office", "通用办公"),
    },
]

KEYS = [c["key"] for c in BATCH]
ANCHOR = "legal_case"


def patch_main() -> None:
    path = ROOT / "backend/app/main.py"
    text = path.read_text(encoding="utf-8")
    for key in KEYS:
        if f"    {key}," not in text:
            text = text.replace(f"    {ANCHOR},\n", f"    {ANCHOR},\n    {key},\n")
        router_line = f"app.include_router({key}.router, prefix=settings.api_prefix, dependencies=_auth)\n"
        if router_line not in text:
            text = text.replace(
                f"app.include_router({ANCHOR}.router, prefix=settings.api_prefix, dependencies=_auth)\n",
                f"app.include_router({ANCHOR}.router, prefix=settings.api_prefix, dependencies=_auth)\n" + router_line,
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
            f'    CapabilityDef("{ANCHOR}",',
            block + f'    CapabilityDef("{ANCHOR}",',
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
        "office_count": 3,
        "industry_count": 0,
    }},
'''
        # insert before hotel_booking near end of AGENTS to avoid double-brace on travel_plan
        marker = '        "id": "hotel_booking",'
        if marker in text:
            text = text.replace(marker, agent + marker, 1)
        cap = (
            f'    {{"key": "{c["key"]}", "name": "{c["name"]}", "category": "{c["cat"]}", '
            f'"widget": "{c["widget"]}", "agent_id": "{c["key"]}"}},\n'
        )
        if f'"key": "{c["key"]}"' not in text:
            text = text.replace(
                '    {"key": "hotel_booking"',
                cap + '    {"key": "hotel_booking"',
                1,
            )
    path.write_text(text, encoding="utf-8")
    print("patched seed")


def patch_hero_presets() -> None:
    path = ROOT / "backend/app/data/hero_presets.py"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        sid = c["scene"]
        industry = c["industry"]
        flow = ", ".join(f'"{x}"' for x in c["flow"])
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
        industry = c["industry"]
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
    path = ROOT / "home/src/data/heroAlign.ts"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        sid = c["scene"]
        aliases = ", ".join(f"'{a}'" for a in c["aliases"][:5])
        line = f"  {sid}: [{aliases}],\n"
        if f"  {sid}:" not in text:
            text = text.replace("  s08:", line + "  s08:")
        else:
            text = re.sub(rf"  {sid}: \[[^\]]*\],\n", line, text)
        if f"'{c['key']}'" not in text:
            text = text.replace(
                "  'legal_case',",
                f"  'legal_case',\n  '{c['key']}',",
            )
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
        aliases = ", ".join(f'"{a}"' for a in c["aliases"][:5])
        line = f'    "{sid}": ({aliases}),\n'
        if f'"{sid}":' not in text:
            text = text.replace('    "s08":', line + '    "s08":')
        else:
            text = re.sub(rf'    "{sid}": \([^)]*\),\n', line, text)
    path.write_text(text, encoding="utf-8")

    path = ROOT / "backend/app/services/keyword_match.py"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if f'"{c["key"]}": "{c["key"]}"' not in text:
            text = text.replace(
                '"legal_case": "legal_case",',
                f'"legal_case": "legal_case",\n    "{c["key"]}": "{c["key"]}",',
            )
            if f'"{c["key"]}": "{c["key"]}"' not in text:
                text = text.replace(
                    '"study_coach": "study_coach",',
                    f'"study_coach": "study_coach",\n    "{c["key"]}": "{c["key"]}",',
                )
    path.write_text(text, encoding="utf-8")

    path = ROOT / "backend/app/services/module_suggest.py"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if f'"{c["key"]}"' not in text.split("_CAPSHIP")[1][:800] if "_CAPSHIP" in text else True:
            pass
        if f'"{c["key"]}"' not in text:
            text = text.replace('"legal_case",', f'"legal_case", "{c["key"]}",')
    path.write_text(text, encoding="utf-8")

    path = ROOT / "backend/app/services/capability_resolver.py"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if f'"{c["key"]}"' not in text:
            text = text.replace('"legal_case")', f'"legal_case", "{c["key"]}")')
    path.write_text(text, encoding="utf-8")

    path = ROOT / "backend/app/services/intent_agent.py"
    text = path.read_text(encoding="utf-8")
    for c in BATCH:
        if c["key"] not in text:
            text = text.replace(
                "课本学习/家默/学习进度→study_coach",
                f"课本学习/家默/学习进度→study_coach，{c['name']}→{c['key']}",
            )
    path.write_text(text, encoding="utf-8")
    print("patched match")


def patch_home_data() -> None:
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
            "  { key: 'legal_case'",
            line + "  { key: 'legal_case'",
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
            "    { key: 'legal_case'",
            line + "    { key: 'legal_case'",
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
            "  legal_case:",
            f"  {c['key']}: '{c['menu_icon']}',\n  legal_case:",
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
        if f"key: '{c['key']}'" in text:
            continue
        aliases = ", ".join(f"'{a}'" for a in c["aliases"][:4])
        block = (
            f"  {{ match: [{aliases}], caps: [\n"
            f"    {{ key: '{c['key']}', label: '{c['name']}' }},\n"
            f"    {{ key: 'notify_im', label: '企微钉钉飞书' }},\n"
            f"  ]}},\n"
        )
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
    for old in ("v12", "v11", "v10", "v9"):
        t = t.replace(f"blockhub_hero_presets_{old}", "blockhub_hero_presets_v13")
    cache.write_text(t, encoding="utf-8")
    print("patched home data")


def patch_parity() -> None:
    path = ROOT / "shared/flutter-parity-matrix.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    container = data["rows"]
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
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
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
    print("wire batch3 done")


if __name__ == "__main__":
    main()
