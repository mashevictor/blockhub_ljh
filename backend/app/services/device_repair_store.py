"""CapShip · device_repair 工单持久化（真实 DB，含派工选人）。"""

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
    assignee_name = (row.assignee_name or "").strip()
    if not assignee_name and row.assignee is not None:
        assignee_name = row.assignee.display_name or row.assignee.email or ""
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
        "assignee_id": row.assignee_id,
        "assignee_name": assignee_name,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "updated_at": row.updated_at.isoformat() if row.updated_at else "",
    }


def list_assignee_candidates(db: Session, tenant_id: str) -> list[dict[str, str]]:
    """同租户可登录用户 = 派工可选人（群成员各自登录 Runtime 即可协作）。"""
    rows = (
        db.query(User)
        .filter(User.tenant_id == tenant_id, User.is_active.is_(True))
        .order_by(User.display_name.asc(), User.email.asc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": u.id,
            "name": (u.display_name or u.email or u.id).strip(),
            "email": u.email or "",
            "role": u.role or "",
        }
        for u in rows
    ]


def list_tickets(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query(DeviceRepairTicket)
        .options(
            joinedload(DeviceRepairTicket.reporter),
            joinedload(DeviceRepairTicket.assignee),
        )
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
    record.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event

        reporter = user.display_name or user.email or "报修人"
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title="新的设备报修 · 待派工",
            content=(
                f"{record.ticket_no} · {record.asset_code} · {record.location}\n"
                f"{record.fault[:200]}\n报修人：{reporter}\n请派工主管打开 Runtime 选维修工"
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
        .options(
            joinedload(DeviceRepairTicket.reporter),
            joinedload(DeviceRepairTicket.assignee),
        )
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
    assignee_id: str | None = None,
    assignee_name: str = "",
) -> dict[str, Any] | None:
    """action: dispatch | complete | next。

    dispatch 须指定维修工；缺人时返回 {"error": "dispatch_requires_assignee"}。
    工单不存在返回 None。
    """
    record = get_ticket(db, tenant_id, ticket_id)
    if not record:
        return None

    if action == "dispatch":
        if record.status != "pending":
            return ticket_to_dict(record)
        name = (assignee_name or "").strip()
        aid = (assignee_id or "").strip() or None
        if aid:
            peer = (
                db.query(User)
                .filter(User.id == aid, User.tenant_id == tenant_id, User.is_active.is_(True))
                .first()
            )
            if not peer:
                return {"error": "assignee_not_found"}
            record.assignee_id = peer.id
            record.assignee_name = (peer.display_name or peer.email or name).strip()
            record.assignee = peer
        elif name:
            record.assignee_id = None
            record.assignee_name = name[:120]
        else:
            return {"error": "dispatch_requires_assignee"}
        next_status = "dispatched"
    elif action == "complete":
        if record.status != "dispatched":
            return ticket_to_dict(record)
        next_status = "done"
    elif action == "next":
        if record.status == "pending":
            return {"error": "dispatch_requires_assignee"}
        next_status = ADVANCE.get(record.status)
        if not next_status:
            return ticket_to_dict(record)
    else:
        return None

    record.status = next_status
    if comment.strip():
        record.comment = comment.strip()
    db.commit()
    db.refresh(record)
    try:
        from app.services.im_delivery_service import notify_business_event

        label = {"dispatched": "已派工", "done": "已完工"}.get(next_status, next_status)
        who = (record.assignee_name or "").strip() or "未指定"
        reporter = ""
        if record.reporter is not None:
            reporter = record.reporter.display_name or record.reporter.email or ""
        extra = f"维修工：{who}"
        if reporter:
            extra = f"报修人：{reporter}\n{extra}"
        notify_business_event(
            db,
            tenant_id=tenant_id,
            title=f"设备报修{label}",
            content=(
                f"{record.ticket_no} · {record.asset_code} · {record.location}\n"
                f"{record.fault[:200]}\n{extra}\n状态：{label}"
            ),
            app_public_id=record.app_public_id,
            path="/device-repair",
            link_label="打开报修工单",
        )
    except Exception:
        pass
    return ticket_to_dict(record)
