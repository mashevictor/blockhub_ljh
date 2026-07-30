#!/usr/bin/env python3
"""Patch industry.ui.gen.json stat values + update codegen VISUAL_EN stats shape."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ZH value → EN value (leave numbers / Latin as-is via identity)
VALUE_EN: dict[str, str] = {
    "漏斗": "Funnel",
    "合规": "Compliance",
    "会员": "Members",
    "门店": "Stores",
    "排课": "Scheduling",
    "家校": "Home-school",
    "适当性": "Suitability",
    "尽调": "Diligence",
    "核保": "Underwriting",
    "理赔": "Claims",
    "披露": "Disclosure",
    "报送": "Filing",
    "风控": "Risk",
    "贷后": "Collections",
    "真表": "Live tables",
    "冷链": "Cold chain",
    "看房": "Viewings",
    "客房": "Rooms",
    "营收": "Revenue",
    "巡检": "Patrol",
    "碳排": "Emissions",
    "网格": "Grids",
    "案件": "Cases",
    "法规": "Statutes",
    "招聘": "Hiring",
    "绩效": "Perf.",
    "线索": "Leads",
    "安全": "Safety",
    "验收": "Acceptance",
    "溯源": "Traceability",
    "补贴": "Subsidies",
    "审核": "Review",
    "版权": "Rights",
    "售后": "Aftersales",
    "试驾": "Test-drive",
    "稼动": "OEE",
    "玩家": "Players",
    "开户": "Onboarding",
    "投研": "Research",
    "承保": "Cover",
    "赔付": "Payout",
    "产品": "Products",
    "监管": "Regulatory",
    "预警": "Alerts",
    "管理": "Mgmt",
    "运单仓配": "WMS",
    "告警": "Alerts",
    "租赁物业": "Leasing",
    "签约": "Contracts",
    "预订": "Booking",
    "日报": "Daily",
    "设备": "Assets",
    "统计": "Stats",
    "热线": "Hotline",
    "治理": "Gov",
    "面试": "Interviews",
    "评估": "Reviews",
    "投放": "Spend",
    "分配": "Assign",
    "检查": "Checks",
    "签字": "Sign-off",
    "产销": "Sales",
    "申报": "Filing",
    "内容": "Content",
    "工单": "Tickets",
    "预约": "Booking",
    "业务大类": "Groups",
    "真数据": "Live",
    "脱敏权限": "Privacy",
    "可对接": "APIs",
    "积分营销": "Loyalty",
    "教务": "Academics",
    "通知": "Notices",
    "客户核验": "KYC",
    "反洗钱": "AML",
    "开户核验": "KYC",
}

# EN labels aligned with ZH label meaning (not the value keyword)
LABEL_EN: dict[str, list[str]] = {
    "office": ["Office scenarios", "Business groups", "Platforms in sync"],
    "mfg": ["Manufacturing scenarios", "OEE board", "Integrable"],
    "sales": ["Sales scenarios", "Business groups", "Live data"],
    "med": ["Healthcare scenarios", "Privacy controls", "Integrable"],
    "game": ["Game scenarios", "Player service", "Content risk"],
    "retail": ["Retail scenarios", "Loyalty", "Store ops"],
    "edu": ["Education scenarios", "Academics", "Notices"],
    "finance": ["Finance scenarios", "Customer KYC", "AML"],
    "bank": ["Banking scenarios", "Account KYC", "AML"],
    "securities": ["Broker scenarios", "Onboarding", "Research"],
    "insurance": ["Insurance scenarios", "Cover", "Payout"],
    "fund": ["AM scenarios", "Products", "Regulatory"],
    "fintech": ["Fintech scenarios", "Alerts", "Mgmt"],
    "logistics": ["Logistics scenarios", "Warehouse", "Alerts"],
    "realestate": ["Property scenarios", "Leasing", "Contracts"],
    "hotel": ["Hospitality scenarios", "Booking", "Daily ops"],
    "energy": ["Energy scenarios", "Assets", "Stats"],
    "gov": ["Gov scenarios", "Hotline", "Governance"],
    "legal": ["Legal scenarios", "Management", "Search"],
    "hr": ["HR scenarios", "Interviews", "Reviews"],
    "marketing": ["Marketing scenarios", "Spend", "Assign"],
    "construction": ["Construction scenarios", "Checks", "Sign-off"],
    "agriculture": ["Agri scenarios", "Sales", "Filing"],
    "media": ["Media scenarios", "Content", "Rights"],
    "auto": ["Auto scenarios", "Tickets", "Booking"],
}


def extract_zh_stats() -> dict[str, list[dict[str, str]]]:
    text = (ROOT / "home/src/data/industryVisualThemes.ts").read_text(encoding="utf-8")
    packs: dict[str, list[dict[str, str]]] = {}
    for m in re.finditer(
        r"^  (\w+): \{\n((?:.*\n)*?)  \},?\n(?=  \w+: \{|})",
        text,
        re.M,
    ):
        key, block = m.group(1), m.group(2)
        stats_m = re.search(r"stats:\s*\[(.*?)\]", block, re.S)
        if not stats_m:
            continue
        stats = re.findall(
            r"\{\s*value:\s*'([^']*)'\s*,\s*label:\s*'([^']*)'\s*\}",
            stats_m.group(1),
        )
        packs[key] = [{"value": v, "label": lab} for v, lab in stats]
    return packs


def en_value(zh_value: str) -> str:
    if zh_value in VALUE_EN:
        return VALUE_EN[zh_value]
    if re.search(r"[\u4e00-\u9fff]", zh_value):
        raise SystemExit(f"Missing EN value for {zh_value!r}")
    return zh_value


def patch_gen() -> None:
    zh_stats = extract_zh_stats()
    zh_path = ROOT / "shared/i18n/messages/zh-CN/industry.ui.gen.json"
    en_path = ROOT / "shared/i18n/messages/en-US/industry.ui.gen.json"
    zh = json.loads(zh_path.read_text(encoding="utf-8"))
    en = json.loads(en_path.read_text(encoding="utf-8"))

    for key, stats in zh_stats.items():
        labels = LABEL_EN.get(key)
        for i, st in enumerate(stats):
            zh[f"industry.ui.{key}.stat.{i}.value"] = st["value"]
            zh[f"industry.ui.{key}.stat.{i}.label"] = st["label"]
            en[f"industry.ui.{key}.stat.{i}.value"] = en_value(st["value"])
            if labels and i < len(labels):
                en[f"industry.ui.{key}.stat.{i}.label"] = labels[i]

    zh_path.write_text(json.dumps(zh, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    en_path.write_text(json.dumps(en, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"patched {len(zh_stats)} packs · legal values EN="
          f"{en.get('industry.ui.legal.stat.1.value')!r}/{en.get('industry.ui.legal.stat.2.value')!r}")


if __name__ == "__main__":
    patch_gen()
