"""CapShip · nurse_shift 护士排班/调班。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import NurseShiftRecord, User

VALID_STATUS = frozenset({"pending", "approved", "rejected"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"NS-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: NurseShiftRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "nurse_name": row.nurse_name,
        "shift_date": row.shift_date,
        "from_shift": row.from_shift,
        "to_shift": row.to_shift,
        "reason": row.reason,
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
        db.query(NurseShiftRecord)
        .options(joinedload(NurseShiftRecord.reporter))
        .filter(NurseShiftRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(NurseShiftRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(NurseShiftRecord.status == status)
    return [to_dict(r) for r in q.order_by(NurseShiftRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    nurse_name: str,
    shift_date: str,
    from_shift: str,
    to_shift: str,
    reason: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    row = NurseShiftRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        nurse_name=(nurse_name or "").strip() or (user.display_name or "护士"),
        shift_date=(shift_date or "").strip(),
        from_shift=(from_shift or "").strip() or "未填",
        to_shift=(to_shift or "").strip() or "未填",
        reason=(reason or "").strip(),
        status="pending",
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
            title="调班申请 · 待批复",
            content=(
                f"{row.record_no} · {row.nurse_name}\n"
                f"{row.shift_date}：{row.from_shift} → {row.to_shift}\n"
                f"{(row.reason or '')[:160]}"
            ),
            app_public_id=row.app_public_id,
            path="/nurse-shift",
            link_label="打开排班",
        )
    except Exception:
        pass
    return to_dict(row)


def decide_record(db: Session, tenant_id: str, record_id: str, *, approve: bool) -> dict[str, Any] | None:
    row = (
        db.query(NurseShiftRecord)
        .options(joinedload(NurseShiftRecord.reporter))
        .filter(NurseShiftRecord.tenant_id == tenant_id, NurseShiftRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    row.status = "approved" if approve else "rejected"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        label = "已通过" if approve else "已驳回"
        notify_business_event(
            db,
            tenant_id=tenant_id,
            title=f"调班{label}",
            content=f"{row.record_no} · {row.nurse_name} · {row.shift_date} · {label}",
            app_public_id=row.app_public_id,
            path="/nurse-shift",
            link_label="打开排班",
        )
    except Exception:
        pass
    return to_dict(row)
