"""行业深度包独立站点配置（资产 URL、SEO、主题）。"""

from __future__ import annotations

from typing import Any

from app.data.industry_packs_all import pack_meta, scene_count_for_pack

# 行业视觉关键词（配图生成脚本同步）
INDUSTRY_VISUAL_KEYWORDS: dict[str, str] = {
    "office": "办公协作 审批 知识库",
    "mfg": "智能制造 产线 设备",
    "sales": "销售漏斗 CRM 合同",
    "med": "医疗健康 导诊 排班",
    "game": "游戏娱乐 玩家 客服",
    "retail": "零售电商 会员 门店",
    "edu": "教育培训 课程 家校",
    "finance": "金融服务 合规 风控",
    "logistics": "物流仓储 运单 调度",
    "realestate": "房地产 看房 物业",
    "hotel": "酒店餐饮 预订 客房",
    "energy": "能源电力 巡检 工单",
    "gov": "政务公用 办事 诉求",
    "legal": "法律服务 案件 合同",
    "hr": "人力资源 招聘 绩效",
    "marketing": "市场营销 活动 线索",
    "construction": "建筑工程 施工 安全",
    "agriculture": "农业 溯源 产销",
    "media": "传媒内容 选题 审核",
    "auto": "汽车交通 售后 试驾",
}


def industry_asset_base(key: str) -> str:
    return f"/industry/{key}"


def build_site_config(pack_key: str, pack_info: dict[str, Any]) -> dict[str, Any]:
    meta = pack_meta(pack_key) or {}
    name = pack_info.get("name") or meta.get("name") or pack_key
    color = pack_info.get("color") or meta.get("color") or "#6366f1"
    tagline = meta.get("tagline") or pack_info.get("tagline") or f"{name}行业智能应用深度包"
    total = scene_count_for_pack(pack_key)
    base = industry_asset_base(pack_key)
    keywords = INDUSTRY_VISUAL_KEYWORDS.get(pack_key, name)

    return {
        "slug": pack_key,
        "title": f"{name} · 行业深度包 | 积木仓 BlockHub",
        "description": f"{tagline}。含 {total} 项业务场景，>> 选模块一键生成网页与 App 应用。",
        "keywords": keywords,
        "assets": {
            "hero": f"{base}/hero.jpg",
            "og": f"{base}/og.png",
            "thumb": f"{base}/thumb.jpg",
        },
        "theme": {
            "primary": color,
            "gradient_to": _shift_color(color, 0.85),
        },
        "stats": {
            "scenes": total,
            "platforms": 5,
            "delivery": "Web · iOS · Android · Windows · macOS",
        },
        "cta": {
            "create_label": f"用 {name} 深度包创建",
            "create_href": f"/#contact-create?mode=industry&pack={pack_key}",
        },
        "site_url": f"/industry/{pack_key}",
    }


def _shift_color(hex_color: str, factor: float) -> str:
    h = hex_color.lstrip("#")
    if len(h) != 6:
        return hex_color
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    r = min(255, int(r * factor))
    g = min(255, int(g * factor))
    b = min(255, int(b * factor))
    return f"#{r:02x}{g:02x}{b:02x}"


def list_all_sites(db_packs: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    """返回全部行业独立站摘要（供 /industry 索引页）。"""
    from app.data.industry_packs_all import ALL_INDUSTRY_PACKS

    db_map = {p["key"]: p for p in (db_packs or [])}
    out: list[dict[str, Any]] = []
    for pack in ALL_INDUSTRY_PACKS:
        key = pack["key"]
        db_row = db_map.get(key, {})
        info = {
            "key": key,
            "name": db_row.get("name") or pack["name"],
            "icon": db_row.get("icon") or pack.get("icon", ""),
            "color": db_row.get("color") or pack.get("color", "#6366f1"),
            "tagline": pack.get("tagline", ""),
        }
        site = build_site_config(key, info)
        out.append({
            "key": key,
            "name": info["name"],
            "icon": info["icon"],
            "color": info["color"],
            "tagline": info["tagline"],
            "scenes": site["stats"]["scenes"],
            "site_url": site["site_url"],
            "assets": site["assets"],
            "theme": site["theme"],
        })
    return out
