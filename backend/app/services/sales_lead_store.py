"""CapShip · sales_lead 销售线索。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import SalesLeadRecord, User

VALID_STATUS = frozenset(('open', 'following', 'won', 'lost'))
VALID_CATEGORY = frozenset(('lead', 'opportunity', 'account'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"SL-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: SalesLeadRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "customer": row.customer,
        "amount": row.amount,
        "owner": row.owner,
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
        db.query(SalesLeadRecord)
        .options(joinedload(SalesLeadRecord.reporter))
        .filter(SalesLeadRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(SalesLeadRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(SalesLeadRecord.status == status)
    return [to_dict(r) for r in q.order_by(SalesLeadRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    customer: str = "",
    amount: str = "",
    owner: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "lead").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "lead"
    row = SalesLeadRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        customer=(customer or "").strip(),
        amount=(amount or "").strip(),
        owner=(owner or "").strip(),
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
            title="销售线索 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'customer', '')}",
            app_public_id=row.app_public_id,
            path="/sales-lead",
            link_label="打开销售线索",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_following(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(SalesLeadRecord)
        .options(joinedload(SalesLeadRecord.reporter))
        .filter(SalesLeadRecord.tenant_id == tenant_id, SalesLeadRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "following":
        return to_dict(row)
    row.status = "following"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="销售线索 · 跟进中",
            content=f"{row.record_no} · 状态已更新为 跟进中",
            app_public_id=row.app_public_id, path="/sales-lead", link_label="打开销售线索",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_won(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(SalesLeadRecord)
        .options(joinedload(SalesLeadRecord.reporter))
        .filter(SalesLeadRecord.tenant_id == tenant_id, SalesLeadRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "won":
        return to_dict(row)
    row.status = "won"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="销售线索 · 成交",
            content=f"{row.record_no} · 状态已更新为 成交",
            app_public_id=row.app_public_id, path="/sales-lead", link_label="打开销售线索",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_lost(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(SalesLeadRecord)
        .options(joinedload(SalesLeadRecord.reporter))
        .filter(SalesLeadRecord.tenant_id == tenant_id, SalesLeadRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "lost":
        return to_dict(row)
    row.status = "lost"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="销售线索 · 丢单",
            content=f"{row.record_no} · 状态已更新为 丢单",
            app_public_id=row.app_public_id, path="/sales-lead", link_label="打开销售线索",
        )
    except Exception:
        pass
    return to_dict(row)

