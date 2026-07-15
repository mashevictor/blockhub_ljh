"""CapShip · leave_request 请假审批。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import LeaveRequestRecord, User

VALID_STATUS = frozenset(('open', 'approved', 'rejected', 'done'))
VALID_CATEGORY = frozenset(('annual', 'sick', 'personal'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"LR-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: LeaveRequestRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "applicant": row.applicant,
        "start_at": row.start_at,
        "end_at": row.end_at,
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
        db.query(LeaveRequestRecord)
        .options(joinedload(LeaveRequestRecord.reporter))
        .filter(LeaveRequestRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(LeaveRequestRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(LeaveRequestRecord.status == status)
    return [to_dict(r) for r in q.order_by(LeaveRequestRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    applicant: str = "",
    start_at: str = "",
    end_at: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "annual").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "annual"
    row = LeaveRequestRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        applicant=(applicant or "").strip(),
        start_at=(start_at or "").strip(),
        end_at=(end_at or "").strip(),
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
            title="请假审批 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'applicant', '')}",
            app_public_id=row.app_public_id,
            path="/leave-request",
            link_label="打开请假审批",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_approved(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(LeaveRequestRecord)
        .options(joinedload(LeaveRequestRecord.reporter))
        .filter(LeaveRequestRecord.tenant_id == tenant_id, LeaveRequestRecord.id == record_id)
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
            db, tenant_id=tenant_id, title="请假审批 · 通过",
            content=f"{row.record_no} · 状态已更新为 通过",
            app_public_id=row.app_public_id, path="/leave-request", link_label="打开请假审批",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_rejected(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(LeaveRequestRecord)
        .options(joinedload(LeaveRequestRecord.reporter))
        .filter(LeaveRequestRecord.tenant_id == tenant_id, LeaveRequestRecord.id == record_id)
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
            db, tenant_id=tenant_id, title="请假审批 · 驳回",
            content=f"{row.record_no} · 状态已更新为 驳回",
            app_public_id=row.app_public_id, path="/leave-request", link_label="打开请假审批",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_done(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(LeaveRequestRecord)
        .options(joinedload(LeaveRequestRecord.reporter))
        .filter(LeaveRequestRecord.tenant_id == tenant_id, LeaveRequestRecord.id == record_id)
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
            db, tenant_id=tenant_id, title="请假审批 · 归档",
            content=f"{row.record_no} · 状态已更新为 归档",
            app_public_id=row.app_public_id, path="/leave-request", link_label="打开请假审批",
        )
    except Exception:
        pass
    return to_dict(row)

