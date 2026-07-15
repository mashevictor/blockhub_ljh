"""CapShip · hotel_booking 酒店预订。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import HotelBookingRecord, User

VALID_STATUS = frozenset({"booked", "checked_in", "cancelled"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"HB-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: HotelBookingRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "guest_name": row.guest_name,
        "room_type": row.room_type,
        "check_in": row.check_in,
        "check_out": row.check_out,
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
        db.query(HotelBookingRecord)
        .options(joinedload(HotelBookingRecord.reporter))
        .filter(HotelBookingRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(HotelBookingRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(HotelBookingRecord.status == status)
    return [to_dict(r) for r in q.order_by(HotelBookingRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    guest_name: str,
    room_type: str = "",
    check_in: str = "",
    check_out: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    row = HotelBookingRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        guest_name=(guest_name or "").strip() or "未填客人",
        room_type=(room_type or "").strip() or "标准间",
        check_in=(check_in or "").strip(),
        check_out=(check_out or "").strip(),
        note=(note or "").strip(),
        status="booked",
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
            title="酒店预订 · 新订单",
            content=(
                f"{row.record_no} · {row.guest_name} · {row.room_type}\n"
                f"入住 {row.check_in} · 退房 {row.check_out}\n{(row.note or '')[:160]}"
            ),
            app_public_id=row.app_public_id,
            path="/hotel-booking",
            link_label="打开酒店预订",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_checked_in(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(HotelBookingRecord)
        .options(joinedload(HotelBookingRecord.reporter))
        .filter(HotelBookingRecord.tenant_id == tenant_id, HotelBookingRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "cancelled":
        return to_dict(row)
    if row.status == "checked_in":
        return to_dict(row)
    row.status = "checked_in"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="酒店预订 · 已入住",
            content=f"{row.record_no} · {row.guest_name} · {row.room_type} · 已办理入住",
            app_public_id=row.app_public_id,
            path="/hotel-booking",
            link_label="打开酒店预订",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_cancelled(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(HotelBookingRecord)
        .options(joinedload(HotelBookingRecord.reporter))
        .filter(HotelBookingRecord.tenant_id == tenant_id, HotelBookingRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "cancelled":
        return to_dict(row)
    row.status = "cancelled"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="酒店预订 · 已取消",
            content=f"{row.record_no} · {row.guest_name} · {row.room_type} · 订单已取消",
            app_public_id=row.app_public_id,
            path="/hotel-booking",
            link_label="打开酒店预订",
        )
    except Exception:
        pass
    return to_dict(row)
