"""CapShip · it_ticket IT 报障持久化。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import ItTicketRecord, User

VALID_STATUS = frozenset({"open", "processing", "done", "closed"})


def _ticket_no() -> str:
    now = datetime.now(timezone.utc)
    return f"IT-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: ItTicketRecord) -> dict[str, Any]:
    reporter_name = ""
    if row.reporter is not None:
        reporter_name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "ticket_no": row.ticket_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "title": row.title,
        "detail": row.detail,
        "urgency": row.urgency,
        "status": row.status,
        "assignee_name": row.assignee_name,
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
        db.query(ItTicketRecord)
        .options(joinedload(ItTicketRecord.reporter))
        .filter(ItTicketRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(ItTicketRecord.app_public_id == app_public_id)
    if status:
        q = q.filter(ItTicketRecord.status == status)
    rows = q.order_by(ItTicketRecord.created_at.desc()).limit(200).all()
    return [to_dict(r) for r in rows]


def create_ticket(
    db: Session,
    user: User,
    *,
    category: str,
    title: str,
    detail: str,
    urgency: str = "medium",
    app_public_id: str = "",
) -> dict[str, Any]:
    row = ItTicketRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        ticket_no=_ticket_no(),
        category=(category or "hardware").strip()[:64],
        title=(title or "").strip()[:200],
        detail=(detail or "").strip(),
        urgency=(urgency or "medium").strip()[:32],
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = (
        db.query(ItTicketRecord)
        .options(joinedload(ItTicketRecord.reporter))
        .filter(ItTicketRecord.id == row.id)
        .one()
    )
    return to_dict(row)


def advance(db: Session, tenant_id: str, ticket_id: str, action: str) -> dict[str, Any] | None:
    row = (
        db.query(ItTicketRecord)
        .options(joinedload(ItTicketRecord.reporter))
        .filter(ItTicketRecord.id == ticket_id, ItTicketRecord.tenant_id == tenant_id)
        .first()
    )
    if not row:
        return None
    mapping = {
        "processing": "processing",
        "done": "done",
        "closed": "closed",
        "reopen": "open",
    }
    nxt = mapping.get(action)
    if not nxt:
        return to_dict(row)
    row.status = nxt
    db.commit()
    db.refresh(row)
    return to_dict(row)
