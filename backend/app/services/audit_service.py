"""Audit log persistence (W5)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db.models import AuditLog


def write_audit_log(
    db: Session,
    *,
    tenant_id: str,
    user_id: str | None,
    action: str,
    resource: str,
    resource_id: str | None = None,
    detail: str = "",
    ip_address: str | None = None,
) -> AuditLog:
    row = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        detail=detail[:2000],
        ip_address=ip_address,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_audit_logs(
    db: Session,
    *,
    tenant_id: str,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    query = db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id)
    total = query.count()
    rows = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    items = [
        {
            "id": r.id,
            "action": r.action,
            "resource": r.resource,
            "resource_id": r.resource_id,
            "detail": r.detail,
            "user_id": r.user_id,
            "ip_address": r.ip_address,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in rows
    ]
    return items, total
