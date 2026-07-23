"""Notification persistence + approval-flow hooks (W4)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import Notification, User


def create_notification(
    db: Session,
    *,
    tenant_id: str,
    title: str,
    content: str = "",
    type: str = "system",
    recipient_user_id: str | None = None,
    reference_id: str | None = None,
) -> Notification:
    note = Notification(
        tenant_id=tenant_id,
        recipient_user_id=recipient_user_id,
        title=title,
        content=content,
        type=type,
        reference_id=reference_id,
        read=False,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def notify_tenant_admins(
    db: Session,
    *,
    tenant_id: str,
    title: str,
    content: str,
    type: str = "approval",
    reference_id: str | None = None,
) -> None:
    """Create one notification per admin in the tenant (dedup by reference_id+type)."""
    if reference_id and db.query(Notification).filter(
        Notification.tenant_id == tenant_id,
        Notification.reference_id == reference_id,
        Notification.type == type,
    ).first():
        return
    admins = (
        db.query(User)
        .filter(User.tenant_id == tenant_id, User.role.in_(("admin", "tenant_owner")))
        .all()
    )
    for admin in admins:
        create_notification(
            db,
            tenant_id=tenant_id,
            title=title,
            content=content,
            type=type,
            recipient_user_id=admin.id,
            reference_id=reference_id,
        )


def list_notifications(
    db: Session,
    *,
    tenant_id: str,
    user: User | None = None,
    read: str | None = None,
) -> list[Notification]:
    query = db.query(Notification).filter(Notification.tenant_id == tenant_id)
    if user is not None and user.role == "employee":
        query = query.filter(Notification.recipient_user_id == user.id)
    if read == "unread":
        query = query.filter(Notification.read.is_(False))
    elif read == "read":
        query = query.filter(Notification.read.is_(True))
    return query.order_by(Notification.created_at.desc()).all()


def mark_read(db: Session, *, tenant_id: str, notification_id: str) -> Notification | None:
    note = (
        db.query(Notification)
        .filter(Notification.tenant_id == tenant_id, Notification.id == notification_id)
        .first()
    )
    if not note:
        return None
    note.read = True
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def mark_all_read(db: Session, *, tenant_id: str, user: User | None = None) -> int:
    query = db.query(Notification).filter(Notification.tenant_id == tenant_id)
    if user is not None and user.role == "employee":
        query = query.filter(Notification.recipient_user_id == user.id)
    count = 0
    for note in query.filter(Notification.read.is_(False)).all():
        note.read = True
        count += 1
    db.commit()
    return count


def _relative_time(dt) -> str:
    if not dt:
        return ""
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    secs = int(diff.total_seconds())
    if secs < 60:
        return "刚刚"
    if secs < 3600:
        return f"{secs // 60} 分钟前"
    if secs < 86400:
        return f"{secs // 3600} 小时前"
    if secs < 86400 * 30:
        return f"{secs // 86400} 天前"
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d")


def notification_to_dict(note: Notification) -> dict[str, Any]:
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "type": note.type,
        "read": note.read,
        "reference_id": note.reference_id,
        "time": _relative_time(note.created_at),
        "created_at": note.created_at.isoformat() if note.created_at else "",
    }
