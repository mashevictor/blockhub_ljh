# -*- coding: utf-8 -*-
"""官网升级套餐订单服务。"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.data.plan_catalog import PAID_CHECKOUT_PLANS, calc_checkout_amount_fen, get_plan
from app.db.models import BillingOrder, Tenant, User
from app.services.aggpay import get_gateway
from app.services.aggpay.base import CheckoutRequest


def order_to_dict(row: BillingOrder) -> dict[str, Any]:
    return {
        "id": row.id,
        "tenant_id": row.tenant_id,
        "user_id": row.user_id,
        "plan_tier": row.plan_tier,
        "seats": row.seats,
        "amount_fen": row.amount_fen,
        "currency": row.currency,
        "status": row.status,
        "provider": row.provider,
        "provider_order_no": row.provider_order_no,
        "pay_url": row.pay_url,
        "paid_at": row.paid_at.isoformat() if row.paid_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def create_checkout_order(
    db: Session,
    user: User,
    *,
    plan_tier: str,
    seats: int = 1,
    months: int = 1,
) -> dict[str, Any]:
    plan_tier = (plan_tier or "").strip()
    if plan_tier not in PAID_CHECKOUT_PLANS:
        raise HTTPException(status_code=400, detail="该套餐不支持在线支付，请预约演示或联系商务")
    if user.role not in {"admin", "tenant_owner"}:
        raise HTTPException(status_code=403, detail="仅租户所有者可升级套餐")

    try:
        amount_fen, seats_n = calc_checkout_amount_fen(plan_tier, seats, months)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    gateway = get_gateway()
    if not gateway.configured():
        raise HTTPException(
            status_code=503,
            detail="聚合收款未配置：请设置 YEEPAY_MERCHANT_NO 与 YEEPAY_APP_KEY 后重试",
        )

    order_id = str(uuid4())
    plan = get_plan(plan_tier)
    subject = f"积木仓·{plan.get('name') or plan_tier}·{seats_n}席·{months}月"

    row = BillingOrder(
        id=order_id,
        tenant_id=user.tenant_id,
        user_id=user.id,
        plan_tier=plan_tier,
        seats=seats_n,
        amount_fen=amount_fen,
        currency="CNY",
        status="pending",
        provider="yeepay",
    )
    db.add(row)
    db.flush()

    try:
        result = gateway.create_checkout(
            CheckoutRequest(
                order_id=order_id,
                amount_fen=amount_fen,
                subject=subject,
                notify_url=gateway.notify_url(),
                return_url=gateway.return_url(order_id),
                payer_user_id=user.id,
            )
        )
    except RuntimeError as e:
        row.status = "failed"
        db.add(row)
        db.commit()
        raise HTTPException(status_code=502, detail=str(e)) from e

    row.provider_order_no = result.provider_order_no
    row.pay_url = result.pay_url
    row.raw_notify_json = {"create": result.raw}
    db.add(row)
    db.commit()
    db.refresh(row)
    return order_to_dict(row)


def get_order(db: Session, user: User, order_id: str) -> BillingOrder:
    row = db.get(BillingOrder, order_id)
    if not row or row.tenant_id != user.tenant_id:
        if user.role != "admin" or not row:
            raise HTTPException(status_code=404, detail="订单不存在")
    return row


def list_orders(db: Session, user: User, *, limit: int = 50) -> list[dict[str, Any]]:
    q = db.query(BillingOrder).filter(BillingOrder.tenant_id == user.tenant_id)
    if user.role == "admin":
        # admin 看本租户即可；跨租户用 set plan
        pass
    rows = q.order_by(BillingOrder.created_at.desc()).limit(max(1, min(limit, 100))).all()
    return [order_to_dict(r) for r in rows]


def apply_paid(db: Session, order: BillingOrder, *, provider_order_no: str = "", raw: dict | None = None) -> BillingOrder:
    if order.status == "paid":
        return order
    now = datetime.now(timezone.utc)
    order.status = "paid"
    order.paid_at = now
    if provider_order_no:
        order.provider_order_no = provider_order_no
    if raw is not None:
        prev = order.raw_notify_json if isinstance(order.raw_notify_json, dict) else {}
        order.raw_notify_json = {**prev, "notify": raw}

    tenant = db.get(Tenant, order.tenant_id)
    if tenant:
        tenant.plan_tier = order.plan_tier
        tenant.seat_quota = max(int(order.seats or 1), int(tenant.seat_quota or 1))
        base = tenant.plan_expires_at
        if base and base.tzinfo is None:
            base = base.replace(tzinfo=timezone.utc)
        if base and base > now:
            tenant.plan_expires_at = base + timedelta(days=30)
        else:
            tenant.plan_expires_at = now + timedelta(days=30)
        db.add(tenant)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def handle_yeepay_notify(db: Session, payload: dict[str, Any], headers: dict[str, str] | None = None) -> dict[str, Any]:
    gateway = get_gateway()
    result = gateway.verify_notify(payload, headers)
    if not result.ok:
        raise HTTPException(status_code=400, detail=result.message or "验签失败")
    if not result.order_id:
        raise HTTPException(status_code=400, detail="回调缺少 orderId")
    order = db.get(BillingOrder, result.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    if result.amount_fen is not None and int(result.amount_fen) != int(order.amount_fen):
        raise HTTPException(status_code=400, detail="金额不匹配")
    if result.paid:
        apply_paid(db, order, provider_order_no=result.provider_order_no, raw=result.raw)
    return {"success": True, "order_id": order.id, "status": order.status, "message": result.message}
