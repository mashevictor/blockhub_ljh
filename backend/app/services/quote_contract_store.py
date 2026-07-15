"""CapShip · quote_contract 报价合同。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import QuoteContractRecord, User

VALID_STATUS = frozenset(('open', 'reviewing', 'approved', 'signed'))
VALID_CATEGORY = frozenset(('quote', 'contract', 'special'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"QC-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: QuoteContractRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "title": row.title,
        "customer": row.customer,
        "amount": row.amount,
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
        db.query(QuoteContractRecord)
        .options(joinedload(QuoteContractRecord.reporter))
        .filter(QuoteContractRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(QuoteContractRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(QuoteContractRecord.status == status)
    return [to_dict(r) for r in q.order_by(QuoteContractRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    title: str = "",
    customer: str = "",
    amount: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "quote").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "quote"
    row = QuoteContractRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        title=(title or "").strip(),
        customer=(customer or "").strip(),
        amount=(amount or "").strip(),
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
            title="报价合同 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'title', '')}",
            app_public_id=row.app_public_id,
            path="/quote-contract",
            link_label="打开报价合同",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_reviewing(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(QuoteContractRecord)
        .options(joinedload(QuoteContractRecord.reporter))
        .filter(QuoteContractRecord.tenant_id == tenant_id, QuoteContractRecord.id == record_id)
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
            db, tenant_id=tenant_id, title="报价合同 · 评审中",
            content=f"{row.record_no} · 状态已更新为 评审中",
            app_public_id=row.app_public_id, path="/quote-contract", link_label="打开报价合同",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_approved(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(QuoteContractRecord)
        .options(joinedload(QuoteContractRecord.reporter))
        .filter(QuoteContractRecord.tenant_id == tenant_id, QuoteContractRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "approved":
        return to_dict(row)
    row.status = "approved"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="报价合同 · 已批准",
            content=f"{row.record_no} · 状态已更新为 已批准",
            app_public_id=row.app_public_id, path="/quote-contract", link_label="打开报价合同",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_signed(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(QuoteContractRecord)
        .options(joinedload(QuoteContractRecord.reporter))
        .filter(QuoteContractRecord.tenant_id == tenant_id, QuoteContractRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "signed":
        return to_dict(row)
    row.status = "signed"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="报价合同 · 已签约",
            content=f"{row.record_no} · 状态已更新为 已签约",
            app_public_id=row.app_public_id, path="/quote-contract", link_label="打开报价合同",
        )
    except Exception:
        pass
    return to_dict(row)

