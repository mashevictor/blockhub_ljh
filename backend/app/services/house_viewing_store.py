"""CapShip · house_viewing 看房签约。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import HouseViewingRecord, User

VALID_STATUS = frozenset(('open', 'following', 'done', 'cancelled'))
VALID_CATEGORY = frozenset(('viewing', 'intent', 'sign'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"HV-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: HouseViewingRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "client_name": row.client_name,
        "property_addr": row.property_addr,
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
        db.query(HouseViewingRecord)
        .options(joinedload(HouseViewingRecord.reporter))
        .filter(HouseViewingRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(HouseViewingRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(HouseViewingRecord.status == status)
    return [to_dict(r) for r in q.order_by(HouseViewingRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    client_name: str = "",
    property_addr: str = "",
    schedule_at: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "viewing").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "viewing"
    row = HouseViewingRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        client_name=(client_name or "").strip(),
        property_addr=(property_addr or "").strip(),
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
            title="看房签约 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'property_addr', '')}",
            app_public_id=row.app_public_id,
            path="/house-viewing",
            link_label="打开看房签约",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_following(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(HouseViewingRecord)
        .options(joinedload(HouseViewingRecord.reporter))
        .filter(HouseViewingRecord.tenant_id == tenant_id, HouseViewingRecord.id == record_id)
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
            db, tenant_id=tenant_id, title="看房签约 · 跟进中",
            content=f"{row.record_no} · 状态已更新为 跟进中",
            app_public_id=row.app_public_id, path="/house-viewing", link_label="打开看房签约",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_done(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(HouseViewingRecord)
        .options(joinedload(HouseViewingRecord.reporter))
        .filter(HouseViewingRecord.tenant_id == tenant_id, HouseViewingRecord.id == record_id)
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
            db, tenant_id=tenant_id, title="看房签约 · 完成",
            content=f"{row.record_no} · 状态已更新为 完成",
            app_public_id=row.app_public_id, path="/house-viewing", link_label="打开看房签约",
        )
    except Exception:
        pass
    return to_dict(row)

