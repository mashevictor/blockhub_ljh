"""CapShip · meeting_booking 会议室预约持久化。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import MeetingBookingRecord, User


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"MT-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: MeetingBookingRecord) -> dict[str, Any]:
    reporter_name = ""
    if row.reporter is not None:
        reporter_name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "room_name": row.room_name,
        "title": row.title,
        "start_at": row.start_at,
        "end_at": row.end_at,
        "attendees": row.attendees,
        "note": row.note,
        "status": row.status,
        "reporter_name": reporter_name,
        "created_at": row.created_at.isoformat() if row.created_at else "",
    }


def list_records(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query(MeetingBookingRecord)
        .options(joinedload(MeetingBookingRecord.reporter))
        .filter(MeetingBookingRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(MeetingBookingRecord.app_public_id == app_public_id)
    if status:
        q = q.filter(MeetingBookingRecord.status == status)
    return [to_dict(r) for r in q.order_by(MeetingBookingRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    room_name: str,
    title: str,
    start_at: str,
    end_at: str,
    attendees: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    row = MeetingBookingRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        room_name=(room_name or "").strip()[:120],
        title=(title or "").strip()[:200],
        start_at=(start_at or "").strip()[:64],
        end_at=(end_at or "").strip()[:64],
        attendees=(attendees or "").strip()[:200],
        note=(note or "").strip(),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = (
        db.query(MeetingBookingRecord)
        .options(joinedload(MeetingBookingRecord.reporter))
        .filter(MeetingBookingRecord.id == row.id)
        .one()
    )
    return to_dict(row)


def advance(db: Session, tenant_id: str, record_id: str, action: str) -> dict[str, Any] | None:
    row = (
        db.query(MeetingBookingRecord)
        .options(joinedload(MeetingBookingRecord.reporter))
        .filter(MeetingBookingRecord.id == record_id, MeetingBookingRecord.tenant_id == tenant_id)
        .first()
    )
    if not row:
        return None
    mapping = {"confirmed": "confirmed", "cancelled": "cancelled", "done": "done"}
    nxt = mapping.get(action)
    if nxt:
        row.status = nxt
        db.commit()
        db.refresh(row)
    return to_dict(row)
