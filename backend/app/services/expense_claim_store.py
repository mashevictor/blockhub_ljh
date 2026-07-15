"""CapShip · expense_claim 报销记账。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import ExpenseClaimRecord, User

VALID_STATUS = frozenset(('open', 'reviewing', 'paid', 'rejected'))
VALID_CATEGORY = frozenset(('travel', 'meal', 'office'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"EC-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: ExpenseClaimRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "title": row.title,
        "amount": row.amount,
        "invoice_no": row.invoice_no,
        "note": row.note,
        "status": row.status,
        "reporter_id": row.reporter_id,
        "reporter_name": name,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "updated_at": row.updated_at.isoformat() if row.updated_at else "",
    }


def list_records(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query(ExpenseClaimRecord)
        .options(joinedload(ExpenseClaimRecord.reporter))
        .filter(ExpenseClaimRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(ExpenseClaimRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(ExpenseClaimRecord.status == status)
    return [to_dict(r) for r in q.order_by(ExpenseClaimRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    title: str = "",
    amount: str = "",
    invoice_no: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "travel").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "travel"
    row = ExpenseClaimRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        title=(title or "").strip(),
        amount=(amount or "").strip(),
        invoice_no=(invoice_no or "").strip(),
        note=(note or "").strip(),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title="报销记账 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'title', '')}",
            app_public_id=row.app_public_id,
            path="/expense-claim",
            link_label="打开报销记账",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_reviewing(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(ExpenseClaimRecord)
        .options(joinedload(ExpenseClaimRecord.reporter))
        .filter(ExpenseClaimRecord.tenant_id == tenant_id, ExpenseClaimRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "reviewing":
        return to_dict(row)
    row.status = "reviewing"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="报销记账 · 审核中",
            content=f"{row.record_no} · 状态已更新为 审核中",
            app_public_id=row.app_public_id, path="/expense-claim", link_label="打开报销记账",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_paid(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(ExpenseClaimRecord)
        .options(joinedload(ExpenseClaimRecord.reporter))
        .filter(ExpenseClaimRecord.tenant_id == tenant_id, ExpenseClaimRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "paid":
        return to_dict(row)
    row.status = "paid"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="报销记账 · 已付款",
            content=f"{row.record_no} · 状态已更新为 已付款",
            app_public_id=row.app_public_id, path="/expense-claim", link_label="打开报销记账",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_rejected(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(ExpenseClaimRecord)
        .options(joinedload(ExpenseClaimRecord.reporter))
        .filter(ExpenseClaimRecord.tenant_id == tenant_id, ExpenseClaimRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "rejected":
        return to_dict(row)
    row.status = "rejected"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="报销记账 · 驳回",
            content=f"{row.record_no} · 状态已更新为 驳回",
            app_public_id=row.app_public_id, path="/expense-claim", link_label="打开报销记账",
        )
    except Exception:
        pass
    return to_dict(row)

