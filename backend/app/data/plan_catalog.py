"""套餐与配额目录（产品文案用「智能出页」，不用 Codegen）。

C 端：c_free / c_plus
B 端：b_team / b_business / b_enterprise
"""

from __future__ import annotations

from typing import Any

# None = 不限制
PlanLimits = dict[str, Any]

PLAN_CATALOG: dict[str, PlanLimits] = {
    "c_free": {
        "id": "c_free",
        "segment": "c",
        "name": "Free 体验",
        "price_label": "¥0",
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
        "features": [
            "最多 10 个应用",
            "对话改页 10 次/天",
            "智能出页 1 次/天",
            "可下载 1 个项目代码",
        ],
    },
    "c_plus": {
        "id": "c_plus",
        "segment": "c",
        "name": "Plus 创作者",
        "price_label": "¥39/人·月",
        "price_fen": 3900,
        "price_fen_per_seat": 3900,
        "max_apps": None,
        "max_seats": 1,
        "compose_edit_per_day": None,
        "smart_page_per_day": None,
        "code_download_lifetime": None,
        "code_download_per_month": None,
        "apk_per_month": 0,
        "kb_mb": 0,
        "industry_packs": 0,
        "schema_approval": False,
        "features": [
            "应用数不限",
            "对话改页不限",
            "智能出页不限",
            "项目代码下载不限",
        ],
    },
    "b_team": {
        "id": "b_team",
        "segment": "b",
        "name": "Team 团队",
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
        "features": [
            "起购 5 席",
            "应用 10 个 · 行业包 1 个",
            "对话改页 / 智能出页（组织共享配额）",
            "契约下载 10 次/月 · APK 4 次/月",
        ],
    },
    "b_business": {
        "id": "b_business",
        "segment": "b",
        "name": "Business 商业",
        "price_label": "¥168/坐席·月",
        "price_fen_per_seat": 16800,
        "max_apps": 50,
        "max_seats": None,
        "min_seats": 10,
        "compose_edit_per_day": None,
        "smart_page_per_day": None,
        "smart_page_per_month": 1000,
        "code_download_lifetime": None,
        "code_download_per_month": 30,
        "apk_per_month": 20,
        "kb_mb": 10240,
        "industry_packs": 5,
        "schema_approval": True,
        "features": [
            "起购 10 席 · 改页审批流",
            "应用 50 个 · 行业包 5 个",
            "智能出页 1000 次/月（共享）",
            "契约下载 30 次/月 · APK 20 次/月 · 知识库 10GB",
        ],
    },
    "b_enterprise": {
        "id": "b_enterprise",
        "segment": "b",
        "name": "Enterprise 企业",
        "price_label": "合同制",
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
        "features": [
            "混合 / 私有化部署",
            "SSO · 审计 · ERP/OA 集成",
            "智能出页与下载按合同",
            "对齐混合部署 80–120 万/年叙事",
        ],
    },
}

DEFAULT_PLAN_ID = "c_free"

# 产品对外统一中文名（禁止在官网写 Codegen）
SMART_PAGE_LABEL = "智能出页"
SMART_PAGE_HINT = "按需求自动生成可运行页面（含二次修订）"


def get_plan(plan_id: str | None) -> PlanLimits:
    pid = (plan_id or DEFAULT_PLAN_ID).strip() or DEFAULT_PLAN_ID
    return dict(PLAN_CATALOG.get(pid) or PLAN_CATALOG[DEFAULT_PLAN_ID])


def list_plans_for_site() -> dict[str, list[PlanLimits]]:
    c = [get_plan(k) for k in ("c_free", "c_plus")]
    b = [get_plan(k) for k in ("b_team", "b_business", "b_enterprise")]
    return {"c": c, "b": b}


PAID_CHECKOUT_PLANS = frozenset({"c_plus", "b_team", "b_business"})


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
