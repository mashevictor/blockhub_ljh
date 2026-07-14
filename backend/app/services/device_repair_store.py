"""CapShip · device_repair 工单持久化（真实 DB，无 mock seed）。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import DeviceRepairTicket, User

VALID_STATUS = frozenset({"pending", "dispatched", "done"})
ADVANCE = {"pending": "dispatched", "dispatched": "done"}


def _ticket_no() -> str:
    now = datetime.now(timezone.utc)
    return f"WO-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def ticket_to_dict(row: DeviceRepairTicket) -> dict[str, Any]:
    reporter_name = ""
    if row.reporter is not None:
        reporter_name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "ticket_no": row.ticket_no,
        "app_public_id": row.app_public_id,
        "asset_code": row.asset_code,
        "location": row.location,
        "fault": row.fault,
        "status": row.status,
        "comment": row.comment,
        "reporter_id": row.reporter_id,
        "reporter_name": reporter_name,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "updated_at": row.updated_at.isoformat() if row.updated_at else "",
    }


def list_tickets(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query(DeviceRepairTicket)
        .options(joinedload(DeviceRepairTicket.reporter))
        .filter(DeviceRepairTicket.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(DeviceRepairTicket.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(DeviceRepairTicket.status == status)
    rows = q.order_by(DeviceRepairTicket.created_at.desc()).limit(200).all()
    return [ticket_to_dict(r) for r in rows]


def create_ticket(
    db: Session,
    user: User,
    *,
    asset_code: str,
    location: str,
    fault: str,
    app_public_id: str = "",
) -> dict[str, Any]:
    record = DeviceRepairTicket(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        ticket_no=_ticket_no(),
        asset_code=asset_code.strip(),
        location=(location or "").strip() or "未填写工位",
        fault=fault.strip(),
        status="pending",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    # 保证返回含报修人展示名
    record.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title="新的设备报修",
            content=(
                f"{record.ticket_no} · {record.asset_code} · {record.location}\n"
                f"{record.fault[:200]}\n状态：待派工"
            ),
            app_public_id=record.app_public_id,
            path="/device-repair",
            link_label="打开报修工单",
        )
    except Exception:
        pass
    return ticket_to_dict(record)


def get_ticket(db: Session, tenant_id: str, ticket_id: str) -> DeviceRepairTicket | None:
    return (
        db.query(DeviceRepairTicket)
        .filter(DeviceRepairTicket.tenant_id == tenant_id, DeviceRepairTicket.id == ticket_id)
        .first()
    )


def advance_ticket(
    db: Session,
    tenant_id: str,
    ticket_id: str,
    *,
    action: str,
    comment: str = "",
) -> dict[str, Any] | None:
    """action: dispatch | complete  或直接 next。"""
    record = get_ticket(db, tenant_id, ticket_id)
    if not record:
        return None
    next_status = ADVANCE.get(record.status)
    if action == "dispatch":
        if record.status != "pending":
            return ticket_to_dict(record)
        next_status = "dispatched"
    elif action == "complete":
        if record.status != "dispatched":
            return ticket_to_dict(record)
        next_status = "done"
    elif action == "next":
        if not next_status:
            return ticket_to_dict(record)
    else:
        return None

    if not next_status:
        return ticket_to_dict(record)
    record.status = next_status
    if comment.strip():
        record.comment = comment.strip()
    db.commit()
    db.refresh(record)
    try:
        from app.services.im_delivery_service import notify_business_event

        label = {"dispatched": "已派工", "done": "已完工"}.get(next_status, next_status)
        notify_business_event(
            db,
            tenant_id=tenant_id,
            title=f"设备报修{label}",
            content=(
                f"{record.ticket_no} · {record.asset_code} · {record.location}\n"
                f"{record.fault[:200]}\n状态：{label}"
            ),
            app_public_id=record.app_public_id,
            path="/device-repair",
            link_label="打开报修工单",
        )
    except Exception:
        pass
    return ticket_to_dict(record)
