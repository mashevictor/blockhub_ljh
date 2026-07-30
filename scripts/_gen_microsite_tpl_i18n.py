#!/usr/bin/env python3
"""Append microsite template style/name/category/brand keys to home.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# id → (zh styleLabel, en styleLabel, zh name, en name, zh cat, en cat, zh brand, en brand)
TPL: dict[str, tuple[str, str, str, str, str, str, str, str]] = {
    "law-firm": ("Helios · 全屏开场", "Helios · Full-screen open", "律所", "Law firm", "商业服务", "Business services", "衡正律师事务所", "Hengzheng Law"),
    "accounting": ("Landed · 稳重商务", "Landed · Steady business", "会计财税", "Accounting & tax", "商业服务", "Business services", "澄算财税", "Chengsuan Tax"),
    "consulting": ("Read Only · 黑金名片", "Read Only · Black-gold card", "企业管理咨询", "Management consulting", "商业服务", "Business services", "观澜咨询", "Guanlan Consulting"),
    "clinic": ("Tessellate · 块面拼贴", "Tessellate · Tile collage", "私立诊所", "Private clinic", "医疗健康", "Healthcare", "安澜综合门诊", "Anlan Clinic"),
    "dental": ("Fractal · 产品焦点", "Fractal · Product focus", "牙科", "Dental", "医疗健康", "Healthcare", "白芽齿科", "Baiya Dental"),
    "wellness": ("Photon · 分区图标条", "Photon · Icon strip", "康养中心", "Wellness center", "医疗健康", "Healthcare", "栖息康养", "Qixi Wellness"),
    "education": ("Massively · 杂志栅格", "Massively · Magazine grid", "在线教育", "Online education", "教育培训", "Education", "启知课堂", "Qizhi Classroom"),
    "training": ("Editorial · 侧栏杂志", "Editorial · Side magazine", "培训机构", "Training school", "教育培训", "Education", "砺才研修", "Licai Academy"),
    "study-abroad": ("Stellar · 居中纵轴", "Stellar · Centered axis", "留学咨询", "Study abroad", "教育培训", "Education", "远航留学", "Yuanhang Abroad"),
    "restaurant": ("Big Picture · 全幅影像", "Big Picture · Full-bleed photo", "精品餐厅", "Fine dining", "餐饮酒店", "Hospitality", "烟火里", "Yanhuoli"),
    "hotel": ("Story · 叙事长滚动", "Story · Long-scroll narrative", "精品酒店", "Boutique hotel", "餐饮酒店", "Hospitality", "松间驿", "Songjian Inn"),
    "real-estate": ("Forty · 大字标题", "Forty · Big type", "房地产中介", "Real-estate agency", "地产建筑", "Real estate", "立居不动产", "Liju Realty"),
    "interior": ("Paradigm · 黑金编辑", "Paradigm · Black-gold editorial", "室内设计", "Interior design", "地产建筑", "Real estate", "界线设计", "Jiexian Design"),
    "saas": ("Hyperspace · 侧栏导航", "Hyperspace · Side nav", "SaaS软件", "SaaS software", "科技制造", "Tech & manufacturing", "FlowBoard", "FlowBoard"),
    "hardware": ("Nova · 电影感科技", "Nova · Cinematic tech", "智能硬件", "Smart hardware", "科技制造", "Tech & manufacturing", "NOVA X", "NOVA X"),
    "manufacturing": ("Solid State · 深色企业", "Solid State · Dark enterprise", "工厂制造", "Factory manufacturing", "科技制造", "Tech & manufacturing", "劲造精密", "Jingzao Precision"),
    "beauty": ("Spectral · 渐变首屏", "Spectral · Gradient hero", "美容院", "Beauty salon", "生活消费", "Lifestyle", "岚光美业", "Languang Beauty"),
    "fitness": ("Dimension · 遮罩面板", "Dimension · Masked panels", "健身工作室", "Fitness studio", "生活消费", "Lifestyle", "脉冲训练馆", "Pulse Gym"),
    "pet": ("Multiverse · 图库矩阵", "Multiverse · Gallery matrix", "宠物服务", "Pet services", "生活消费", "Lifestyle", "爪迹生活", "Zhuaji Pets"),
    "photography": ("Sonar · 黑金瀑布流", "Sonar · Black-gold masonry", "摄影工作室", "Photo studio", "生活消费", "Lifestyle", "光迹影像", "Guangji Photo"),
    "game": ("Starrail · 暗色运营台", "Starrail · Dark ops console", "游戏娱乐", "Games & entertainment", "科技娱乐", "Tech entertainment", "星轨互动", "Xinggui Interactive"),
}


def patch(locale: str, take_zh: bool) -> None:
    path = ROOT / "shared" / "i18n" / "messages" / locale / "home.json"
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    for tid, vals in TPL.items():
        zh_style, en_style, zh_name, en_name, zh_cat, en_cat, zh_brand, en_brand = vals
        data[f"industry.ms.tpl.{tid}.style"] = zh_style if take_zh else en_style
        data[f"industry.ms.tpl.{tid}.name"] = zh_name if take_zh else en_name
        data[f"industry.ms.tpl.{tid}.category"] = zh_cat if take_zh else en_cat
        data[f"industry.ms.tpl.{tid}.brand"] = zh_brand if take_zh else en_brand
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK  {path.relative_to(ROOT)} (+{len(TPL)*4} tpl keys)")


def main() -> None:
    patch("zh-CN", True)
    patch("en-US", False)


if __name__ == "__main__":
    main()
