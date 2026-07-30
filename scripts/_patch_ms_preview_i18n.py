#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ZH = {
    "industry.ms.preview.brand_suffix": "方案",
    "industry.ms.preview.nav_scenes": "业务场景",
    "industry.ms.preview.nav_highlights": "方案亮点",
    "industry.ms.preview.nav_contact": "获取方案",
    "industry.ms.preview.cta_get": "获取方案",
    "industry.ms.preview.cta_scenes": "查看场景",
    "industry.ms.preview.section_scenes": "业务场景",
    "industry.ms.preview.section_highlights": "方案亮点",
    "industry.ms.preview.scenes_lead": "文案来自「{{name}}」行业包；下方仅切换视觉模板「{{style}}」。",
    "industry.ms.preview.highlights_lead": "行业内容固定，模板只决定版式与视觉气质。",
    "industry.ms.preview.contact_lead": "确认风格后，可在积木仓用此模板编排正式能力并发布。",
    "industry.ms.preview.back_site": "返回方案站",
    "industry.ms.preview.compose_app": "去编排应用",
    "industry.ms.preview.footer_preview": "{{name}}行业预览",
    "industry.ms.preview.fallback_scene": "可扩展场景",
    "industry.ms.preview.fallback_scene_detail": "按需增减{{name}}正式能力模块。",
    "industry.ms.preview.fallback_highlight": "场景闭环",
    "industry.ms.preview.scene_card_detail": "{{name}}业务场景，可落地为正式能力。",
    "industry.ms.preview.highlight_card_detail": "{{name}}方案亮点，便于投放转化与内部对齐。",
    "industry.ms.preview.default_headline": "{{name}}智能应用方案",
}
EN = {
    "industry.ms.preview.brand_suffix": " solutions",
    "industry.ms.preview.nav_scenes": "Scenarios",
    "industry.ms.preview.nav_highlights": "Highlights",
    "industry.ms.preview.nav_contact": "Get the plan",
    "industry.ms.preview.cta_get": "Get the plan",
    "industry.ms.preview.cta_scenes": "View scenarios",
    "industry.ms.preview.section_scenes": "Scenarios",
    "industry.ms.preview.section_highlights": "Highlights",
    "industry.ms.preview.scenes_lead": 'Copy is from the {{name}} pack; below only switches visual template "{{style}}".',
    "industry.ms.preview.highlights_lead": "Industry content stays fixed; the template only changes layout and look.",
    "industry.ms.preview.contact_lead": "After confirming the look, compose live capabilities with this template in BlockHub.",
    "industry.ms.preview.back_site": "Back to solution site",
    "industry.ms.preview.compose_app": "Compose app",
    "industry.ms.preview.footer_preview": "{{name}} industry preview",
    "industry.ms.preview.fallback_scene": "Extensible scenario",
    "industry.ms.preview.fallback_scene_detail": "Add or remove {{name}} live capability modules as needed.",
    "industry.ms.preview.fallback_highlight": "Closed-loop scenarios",
    "industry.ms.preview.scene_card_detail": "{{name}} business scenario — ready as a live capability.",
    "industry.ms.preview.highlight_card_detail": "{{name}} solution highlight — for outreach and internal alignment.",
    "industry.ms.preview.default_headline": "{{name}} smart-app solution",
}

for loc, pairs in [("zh-CN", ZH), ("en-US", EN)]:
    p = ROOT / f"shared/i18n/messages/{loc}/home.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    data.update(pairs)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(loc, "ok", len(pairs), "keys")
