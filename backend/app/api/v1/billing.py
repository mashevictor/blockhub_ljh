"""套餐目录与当前用量（官网 / Runtime 共用）。"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.data.plan_catalog import SMART_PAGE_HINT, SMART_PAGE_LABEL, get_plan, list_plans_for_site
from app.db.models import Tenant, User
from app.db.session import get_db
from app.services.plan_usage import resolve_plan_for_user, usage_summary

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans")
def list_plans() -> dict:
    """公开：C/B 套餐说明（产品文案用「智能出页」）。"""
    groups = list_plans_for_site()
    return {
        "smart_page_label": SMART_PAGE_LABEL,
        "smart_page_hint": SMART_PAGE_HINT,
        "c": groups["c"],
        "b": groups["b"],
    }


@router.get("/me")
def my_plan(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return usage_summary(db, user)


class SetPlanBody(BaseModel):
    plan_tier: str
    seat_quota: int | None = None


@router.put("/tenants/{tenant_id}/plan")
def admin_set_plan(
    tenant_id: str,
    body: SetPlanBody,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> dict:
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="租户不存在")
    plan = get_plan(body.plan_tier)
    tenant.plan_tier = plan["id"]
    if body.seat_quota is not None:
        tenant.seat_quota = max(1, int(body.seat_quota))
    elif plan.get("min_seats"):
        tenant.seat_quota = max(int(tenant.seat_quota or 1), int(plan["min_seats"]))
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return {
        "tenant_id": tenant.id,
        "plan_tier": tenant.plan_tier,
        "seat_quota": tenant.seat_quota,
        "plan": plan,
    }
