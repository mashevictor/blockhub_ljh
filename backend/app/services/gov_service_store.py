"""CapShip · gov_service 政务办事。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import GovServiceRecord, User

VALID_STATUS = frozenset(('open', 'processing', 'done'))
VALID_CATEGORY = frozenset(('guide', 'appeal', 'progress'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"GS-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: GovServiceRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "title": row.title,
        "dept": row.dept,
        "ticket_no": row.ticket_no,
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
        db.query(GovServiceRecord)
        .options(joinedload(GovServiceRecord.reporter))
        .filter(GovServiceRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(GovServiceRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(GovServiceRecord.status == status)
    return [to_dict(r) for r in q.order_by(GovServiceRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    title: str = "",
    dept: str = "",
    ticket_no: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "guide").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "guide"
    row = GovServiceRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        title=(title or "").strip(),
        dept=(dept or "").strip(),
        ticket_no=(ticket_no or "").strip(),
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
            title="政务办事 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'title', '')}",
            app_public_id=row.app_public_id,
            path="/gov-service",
            link_label="打开政务办事",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_processing(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(GovServiceRecord)
        .options(joinedload(GovServiceRecord.reporter))
        .filter(GovServiceRecord.tenant_id == tenant_id, GovServiceRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "processing":
        return to_dict(row)
    row.status = "processing"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="政务办事 · 办理中",
            content=f"{row.record_no} · 状态已更新为 办理中",
            app_public_id=row.app_public_id, path="/gov-service", link_label="打开政务办事",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_done(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(GovServiceRecord)
        .options(joinedload(GovServiceRecord.reporter))
        .filter(GovServiceRecord.tenant_id == tenant_id, GovServiceRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "done":
        return to_dict(row)
    row.status = "done"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="政务办事 · 办结",
            content=f"{row.record_no} · 状态已更新为 办结",
            app_public_id=row.app_public_id, path="/gov-service", link_label="打开政务办事",
        )
    except Exception:
        pass
    return to_dict(row)

