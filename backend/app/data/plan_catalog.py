"""套餐与配额目录（产品文案用「智能出页」，不用 Codegen）。

公开展示四档：c_free / c_plus / b_business / b_enterprise
遗留：b_team（已下线售卖，存量租户仍可读配额）
"""

from __future__ import annotations

from typing import Any

# None = 不限制
PlanLimits = dict[str, Any]

PLAN_CATALOG: dict[str, PlanLimits] = {
    "c_free": {
        "id": "c_free",
        "segment": "c",
        "name": "免费版 Free",
        "price_label": "¥0/永久",
        "tagline": "个人试用、原型验证",
        "max_apps": 10,
        "max_seats": 1,
        "compose_edit_per_day": 10,
        "smart_page_per_day": 1,  # 智能出页（原 codegen）
        "code_download_lifetime": 1,  # 累计可下载项目数
        "code_download_per_month": None,
        "apk_per_month": 0,
        "kb_mb": 0,
        "industry_packs": 0,
        "schema_approval": False,
        "commercial_use": False,
        "org_management": False,
        "features": [
            "应用上限 10 个",
            "对话改页 10 次/天",
            "智能出页 1 次/天",
            "代码下载 1 次",
            "无审批流与行业包",
            "不可商用",
        ],
    },
    "c_plus": {
        "id": "c_plus",
        "segment": "c",
        "name": "创作者版 Plus",
        "price_label": "¥39/开发者/月",
        "tagline": "独立开发者 / 3 人内小团队",
        "price_fen": 3900,
        "price_fen_per_seat": 3900,
        "max_apps": None,
        "max_seats": 3,  # Plus 仅限 ≤3 人微型团队
        "min_seats": 1,
        "compose_edit_per_day": None,
        "smart_page_per_day": None,
        "code_download_lifetime": None,
        "code_download_per_month": None,
        "apk_per_month": 0,
        "kb_mb": 0,
        "industry_packs": 0,
        "schema_approval": False,
        "commercial_use": False,
        "org_management": False,
        "features": [
            "应用数量不限",
            "对话改页不限",
            "智能出页不限",
            "代码下载不限",
            "无企业组织管理",
            "禁止规模化商用",
        ],
    },
    # 遗留档：不再公开展示 / 不可新购；存量租户继续按此配额计量
    "b_team": {
        "id": "b_team",
        "segment": "b",
        "name": "Team 团队（遗留）",
        "price_label": "¥98/坐席·月",
        "price_fen_per_seat": 9800,
        "max_apps": 10,
        "max_seats": None,
        "min_seats": 5,
        "compose_edit_per_day": None,
        "smart_page_per_day": None,
        "smart_page_per_month": 200,
        "code_download_lifetime": None,
        "code_download_per_month": 10,
        "apk_per_month": 4,
        "kb_mb": 1024,
        "industry_packs": 1,
        "schema_approval": False,
        "commercial_use": True,
        "org_management": True,
        "legacy": True,
        "features": [
            "遗留套餐 · 请升级至商业版 Business",
            "应用 10 个 · 行业包 1 个",
            "对话改页不限 · 智能出页组织共享",
        ],
    },
    "b_business": {
        "id": "b_business",
        "segment": "b",
        "name": "商业版 Business",
        "price_label": "¥148/开发者/月",
        "tagline": "企业团队 / 正式业务系统",
        "price_fen_per_seat": 14800,
        "max_apps": 50,
        "max_seats": None,
        "min_seats": 1,
        "compose_edit_per_day": None,
        "smart_page_per_day": None,
        "smart_page_per_month": 2000,  # AI 出页组织共享
        "code_download_lifetime": None,
        "code_download_per_month": 30,
        "apk_per_month": 20,
        "kb_mb": 10240,
        "industry_packs": 5,
        "schema_approval": True,
        "commercial_use": True,
        "org_management": True,
        "features": [
            "应用上限 50 个",
            "AI 出页 2000 次/月共享",
            "企业组织与权限管理",
            "审批流与行业模板包",
            "操作日志与基础支持",
            "完整商用授权",
        ],
    },
    "b_enterprise": {
        "id": "b_enterprise",
        "segment": "b",
        "name": "企业版 Enterprise",
        "price_label": "定制",
        "tagline": "私有化部署 / 定制集成",
        "max_apps": None,
        "max_seats": None,
        "min_seats": None,
        "compose_edit_per_day": None,
        "smart_page_per_day": None,
        "smart_page_per_month": None,
        "code_download_lifetime": None,
        "code_download_per_month": None,
        "apk_per_month": None,
        "kb_mb": None,
        "industry_packs": None,
        "schema_approval": True,
        "commercial_use": True,
        "org_management": True,
        "features": [
            "私有化 / 混合部署",
            "资源额度无上限",
            "SSO 单点登录",
            "专属客户成功经理",
            "等保合规支持",
            "深度系统集成",
        ],
    },
}

DEFAULT_PLAN_ID = "c_free"

# 产品对外统一中文名（禁止在官网写 Codegen）
SMART_PAGE_LABEL = "智能出页"
SMART_PAGE_HINT = (
    "用一句话让 AI 生成整页可运行界面（小游戏、工具页等），"
    "也可对已生成页做二次修订；点选现成正式能力不占此次数"
)
COMPOSE_EDIT_LABEL = "对话改页"
COMPOSE_EDIT_HINT = (
    "在 Runtime 用自然语言改菜单、表单字段与控件"
    "（例如「请假开始日期改成日期选择」）；每次成功改动计 1 次，"
    "澄清问答不计次"
)

# 官网 / 结算公开展示（不含遗留 b_team）
PUBLIC_PLAN_IDS = ("c_free", "c_plus", "b_business", "b_enterprise")


def get_plan(plan_id: str | None) -> PlanLimits:
    pid = (plan_id or DEFAULT_PLAN_ID).strip() or DEFAULT_PLAN_ID
    return dict(PLAN_CATALOG.get(pid) or PLAN_CATALOG[DEFAULT_PLAN_ID])


def list_plans_for_site() -> dict[str, list[PlanLimits]]:
    c = [get_plan(k) for k in ("c_free", "c_plus")]
    b = [get_plan(k) for k in ("b_business", "b_enterprise")]
    return {"c": c, "b": b, "all": [get_plan(k) for k in PUBLIC_PLAN_IDS]}


PAID_CHECKOUT_PLANS = frozenset({"c_plus", "b_business"})


def calc_checkout_amount_fen(plan_id: str, seats: int, months: int = 1) -> tuple[int, int]:
    plan = get_plan(plan_id)
    if plan_id not in PAID_CHECKOUT_PLANS:
        raise ValueError(f"套餐 {plan_id} 不支持在线支付")
    unit = int(plan.get("price_fen_per_seat") or plan.get("price_fen") or 0)
    if unit <= 0:
        raise ValueError(f"套餐 {plan_id} 未配置价格")
    min_seats = int(plan.get("min_seats") or 1)
    max_seats = plan.get("max_seats")
    seats_n = max(int(seats), min_seats)
    if max_seats is not None:
        seats_n = min(seats_n, int(max_seats))
    months_n = max(1, int(months))
    return unit * seats_n * months_n, seats_n
