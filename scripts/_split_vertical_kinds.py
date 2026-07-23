#!/usr/bin/env python3
"""为 DeepSeek form_list 场景补差异化 vertical kinds（真 API），并接线 mfg pack。"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.vertical_ops_catalog import VERTICAL_OPS  # noqa: E402

DS = ROOT / "scripts" / "_vertical_deepseek"
CATALOG_JSON = ROOT / "backend" / "app" / "data" / "_vertical_ops_catalog.json"

# 把过多落到共享/泛化能力的 form 场景，拆出行业专用 kind
EXTRA_KINDS: dict[str, list[dict]] = {
    "marketing": [
        {"key": "mkt_ab_test", "name": "AB文案测试", "category": "内容投放", "match": ("A/B", "文案测试", "AB")},
        {"key": "mkt_roi", "name": "投放复盘", "category": "效果分析", "match": ("复盘", "ROI", "归因")},
        {"key": "mkt_sign", "name": "活动签到", "category": "活动运营", "match": ("签到", "核销", "抽奖")},
        {"key": "mkt_coupon", "name": "券包触达", "category": "会员触达", "match": ("券", "触达", "唤醒", "生日")},
    ],
    "media": [
        {"key": "media_topic", "name": "选题申报", "category": "选题策划", "match": ("选题", "采访", "角本", "热点")},
        {"key": "media_asset", "name": "素材版权", "category": "内容生产", "match": ("素材", "版权", "配音", "封面")},
        {"key": "media_live", "name": "直播场控", "category": "发布运营", "match": ("直播", "分发", "下架")},
    ],
    "auto": [
        {"key": "auto_parts", "name": "配件库存", "category": "配件库存", "match": ("配件", "缺件", "旧件", "索赔件", "盘点")},
        {"key": "auto_claim", "name": "事故理赔", "category": "理赔协同", "match": ("理赔", "定损", "代步")},
        {"key": "auto_charge", "name": "充电桩运维", "category": "充电年检", "match": ("充电", "年检", "救援")},
    ],
    "edu": [
        {"key": "edu_makeup", "name": "补考登记", "category": "学业评估", "match": ("补考", "进步榜", "不及格")},
        {"key": "edu_transfer", "name": "学籍异动", "category": "学籍财务", "match": ("学籍", "退费", "奖学金")},
    ],
    "gov": [
        {"key": "gov_supervise", "name": "催办督办", "category": "诉求热线", "match": ("催办", "督办", "回访", "合并")},
        {"key": "gov_public", "name": "信息公开", "category": "应急公开", "match": ("信息公开", "预警", "舆情")},
    ],
    "legal": [
        {"key": "legal_enforce", "name": "执行回款", "category": "执行回款", "match": ("执行", "回款", "失信", "财产线索")},
        {"key": "legal_preserve", "name": "诉讼保全", "category": "案件立案", "match": ("保全", "冲突检索", "管辖")},
    ],
    "hr": [
        {"key": "hr_offer", "name": "Offer审批", "category": "招聘入职", "match": ("Offer", "面试", "简历", "转正")},
        {"key": "hr_idp", "name": "个人发展", "category": "培训发展", "match": ("IDP", "导师", "认证", "内训讲师")},
    ],
    "construction": [
        {"key": "const_visa", "name": "工程签证", "category": "进度签证", "match": ("签证", "变更", "工期", "节点")},
        {"key": "const_labor", "name": "劳务实名", "category": "劳务物资", "match": ("劳务", "实名", "分包")},
    ],
    "agriculture": [
        {"key": "agro_pest", "name": "病虫害上报", "category": "病虫害", "match": ("病虫", "测报", "飞防", "检疫")},
        {"key": "agro_trace", "name": "溯源批次", "category": "产销溯源", "match": ("溯源", "冷链", "抽检", "产销")},
    ],
    "energy": [
        {"key": "energy_hotwork", "name": "动火票", "category": "两票三制", "match": ("动火", "终结", "典型票")},
        {"key": "energy_restore", "name": "复电确认", "category": "停电抢修", "match": ("复电", "抢修", "保电")},
    ],
    "mfg": [],  # mfg uses mfg_ops table separately
}


def match_kind(name: str, extras: list[dict]) -> str | None:
    for ex in extras:
        if any(m in name for m in ex["match"]):
            return ex["key"]
    return None


def main() -> None:
    raw = json.loads(CATALOG_JSON.read_text(encoding="utf-8"))
    new_defs: list[tuple[str, str, dict]] = []

    for ind_key, extras in EXTRA_KINDS.items():
        if not extras:
            continue
        p = DS / f"_{ind_key}_scenes_deepseek.json"
        if not p.exists():
            continue
        scenes = json.loads(p.read_text(encoding="utf-8"))["scenes"]
        kinds = raw[ind_key]["kinds"]
        for ex in extras:
            if ex["key"] not in kinds:
                kinds[ex["key"]] = {
                    "name": ex["name"],
                    "category": ex["category"],
                    "prefix": ex["key"].split("_")[-1][:2].upper() or "X",
                    "fields": [["title", "标题"], ["field_a", "关键信息"], ["note", "备注", True]],
                    "done_action": "done",
                    "done_label": "完成",
                    "scenes": [],
                }
                new_defs.append((ind_key, ex["key"], kinds[ex["key"]]))
        # remap scene capability_keys in SSOT py via regenerating from json with remaps
        for s in scenes:
            mk = match_kind(s["name"], extras)
            if mk:
                s["capability_key"] = mk
                sc = kinds[mk].setdefault("scenes", [])
                if [s["name"], s.get("problem") or s["name"]] not in sc and (s["name"],) not in [(x[0],) for x in sc]:
                    sc.append([s["name"], s.get("problem") or s["name"]])
        # rewrite deepseek json + scene py
        p.write_text(json.dumps({"industry_key": ind_key, "industry_name": raw[ind_key]["name"], "scenes": scenes, "scene_count": len(scenes), "source": "deepseek_vertical_batch+kind_split"}, ensure_ascii=False, indent=2), encoding="utf-8")
        # write scene capabilities
        from scripts.apply_vertical_deepseek_scenes import write_scene_py  # type: ignore

    CATALOG_JSON.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")

    # rewrite scene py files for remapped industries
    sys.path.insert(0, str(ROOT / "scripts"))
    # inline write
    for ind_key in EXTRA_KINDS:
        p = DS / f"_{ind_key}_scenes_deepseek.json"
        if not p.exists() or ind_key == "mfg":
            continue
        data = json.loads(p.read_text(encoding="utf-8"))
        scenes = data["scenes"]
        name = raw.get(ind_key, {}).get("name") or ind_key
        seen = set()
        uniq = []
        for s in scenes:
            n = s["name"]
            if n in seen:
                continue
            seen.add(n)
            uniq.append(s)
        body = (
            f'"""{name} 场景 → 真能力 SSOT（DeepSeek 丰富）。"""\n\n'
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
        (ROOT / "backend/app/data" / f"{ind_key}_scene_capabilities.py").write_text(body, encoding="utf-8")
        print("rewrote", ind_key, len(uniq))

    # mfg scenes already written; wire pack
    packs = ROOT / "backend/app/data/industry_packs_all.py"
    text = packs.read_text(encoding="utf-8")
    if "mfg_pack_scenes" not in text:
        text = text.replace(
            "from app.data.hotel_scene_capabilities import hotel_pack_scenes\n",
            "from app.data.hotel_scene_capabilities import hotel_pack_scenes\n"
            "from app.data.mfg_scene_capabilities import mfg_pack_scenes\n",
        )
    # replace mfg scenes inline
    import re as _re
    text2, n = _re.subn(
        r'("key": "mfg",\s*"name": "传统制造",\s*"icon": ".*?,\s*"color": ".*?,\s*"tagline": ".*?,\s*"scenes": )\[[\s\S]*?\n    \]',
        r"\1mfg_pack_scenes()",
        text,
        count=1,
    )
    if n == 1:
        packs.write_text(text2, encoding="utf-8")
        print("wired mfg_pack_scenes")
    else:
        packs.write_text(text, encoding="utf-8")
        print("warn mfg scenes not replaced, n=", n)

    # registry new kinds
    reg = ROOT / "backend/app/data/capability_registry.py"
    rtext = reg.read_text(encoding="utf-8")
    lines = ["\n# --- vertical_ops kind split ---"]
    for ind_key, kind, meta in new_defs:
        if f'CapabilityDef("{kind}"' in rtext:
            continue
        widget = "".join(p.title() for p in kind.split("_")) + "Widget"
        route = "/" + kind.replace("_", "-")
        ind_name = raw[ind_key]["name"]
        lines.append(
            f'    CapabilityDef("{kind}", "{meta["name"]}", "{ind_name}", "{widget}", "{kind}",\n'
            f'                    "capability_vertical", ("{meta["name"]}",),\n'
            f'                    web_pkg="@blockhub/web-capability-vertical-ops",\n'
            f'                    menu_icon="module", menu_label="{meta["name"]}", route="{route}"),'
        )
    if len(lines) > 1:
        marker = "\nINDUSTRY_HINTS"
        idx = rtext.find(marker)
        close = rtext.rfind("]", 0, idx)
        rtext = rtext[:close] + "\n".join(lines) + "\n" + rtext[close:]
        reg.write_text(rtext, encoding="utf-8")
        print("registry +", len(lines) - 1)
    print("new kinds", len(new_defs))


if __name__ == "__main__":
    main()
