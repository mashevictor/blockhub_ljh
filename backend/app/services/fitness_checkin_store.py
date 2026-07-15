"""CapShip · fitness_checkin 健身打卡。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import FitnessCheckinRecord, User

VALID_STATUS = frozenset(('open', 'done'))
VALID_CATEGORY = frozenset(('book', 'checkin', 'coach'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"FC-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: FitnessCheckinRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "member_name": row.member_name,
        "class_name": row.class_name,
        "schedule_at": row.schedule_at,
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
        db.query(FitnessCheckinRecord)
        .options(joinedload(FitnessCheckinRecord.reporter))
        .filter(FitnessCheckinRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(FitnessCheckinRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(FitnessCheckinRecord.status == status)
    return [to_dict(r) for r in q.order_by(FitnessCheckinRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    member_name: str = "",
    class_name: str = "",
    schedule_at: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "checkin").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "checkin"
    row = FitnessCheckinRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        member_name=(member_name or "").strip(),
        class_name=(class_name or "").strip(),
        schedule_at=(schedule_at or "").strip(),
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
            title="健身打卡 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'class_name', '')}",
            app_public_id=row.app_public_id,
            path="/fitness-checkin",
            link_label="打开健身打卡",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_done(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(FitnessCheckinRecord)
        .options(joinedload(FitnessCheckinRecord.reporter))
        .filter(FitnessCheckinRecord.tenant_id == tenant_id, FitnessCheckinRecord.id == record_id)
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
            db, tenant_id=tenant_id, title="健身打卡 · 完成",
            content=f"{row.record_no} · 状态已更新为 完成",
            app_public_id=row.app_public_id, path="/fitness-checkin", link_label="打开健身打卡",
        )
    except Exception:
        pass
    return to_dict(row)

