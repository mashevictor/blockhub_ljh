"""套餐目录、用量、升级套餐下单与聚合收款回调。"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin, require_billing_payer
from app.data.plan_catalog import SMART_PAGE_HINT, SMART_PAGE_LABEL, get_plan, list_plans_for_site
from app.db.models import Tenant, User
from app.db.session import get_db
from app.services import billing_store
from app.services.plan_usage import usage_summary

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans")
def list_plans() -> dict:
    """公开：套餐说明（Free / Plus / Business / Enterprise）。"""
    groups = list_plans_for_site()
    return {
        "smart_page_label": SMART_PAGE_LABEL,
        "smart_page_hint": SMART_PAGE_HINT,
        "tip": "Plus 版仅限 ≤3 人微型团队使用，企业规模化商用请选购 Business 及以上版本",
        "c": groups["c"],
        "b": groups["b"],
        "all": groups.get("all") or [*groups["c"], *groups["b"]],
    }


@router.get("/me")
def my_plan(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    summary = usage_summary(db, user)
    recent = billing_store.list_orders(db, user, limit=8)
    paid = [o for o in recent if o.get("status") == "paid"]
    summary["recent_orders"] = paid[:5]
    return summary


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
        "plan_expires_at": tenant.plan_expires_at.isoformat() if tenant.plan_expires_at else None,
        "plan": plan,
    }


class CheckoutBody(BaseModel):
    plan_tier: str = Field(..., min_length=2, max_length=32)
    seats: int = Field(1, ge=1, le=500)
    months: int = Field(1, ge=1, le=12)


@router.post("/checkout")
def checkout(
    body: CheckoutBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_billing_payer)],
) -> dict:
    order = billing_store.create_checkout_order(
        db,
        user,
        plan_tier=body.plan_tier,
        seats=body.seats,
        months=body.months,
    )
    return {"success": True, "order": order}


@router.get("/orders")
def list_my_orders(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    limit: int = 50,
) -> dict:
    return {"items": billing_store.list_orders(db, user, limit=limit)}


@router.get("/orders/{order_id}")
def get_order(
    order_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    row = billing_store.get_order(db, user, order_id)
    return {"order": billing_store.order_to_dict(row)}


@router.post("/webhook/yeepay")
async def yeepay_webhook(request: Request, db: Annotated[Session, Depends(get_db)]) -> dict[str, Any]:
    """聚合收款异步通知（公开；验签）。"""
    content_type = (request.headers.get("content-type") or "").lower()
    payload: dict[str, Any]
    if "application/json" in content_type:
        body = await request.json()
        payload = body if isinstance(body, dict) else {"raw": body}
    else:
        form = await request.form()
        payload = {k: form.get(k) for k in form.keys()}
    headers = {k: v for k, v in request.headers.items()}
    return billing_store.handle_yeepay_notify(db, payload, headers)
