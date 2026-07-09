from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services.notification_service import (
    list_notifications,
    mark_all_read,
    mark_read,
    notification_to_dict,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications_api(
    read: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = list_notifications(db, tenant_id=user.tenant_id, user=user, read=read)
    unread = sum(1 for n in items if not n.read)
    return {"total": len(items), "unread": unread, "items": [notification_to_dict(n) for n in items]}


@router.post("/{notification_id}/read")
def mark_read_api(
    notification_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    note = mark_read(db, tenant_id=user.tenant_id, notification_id=notification_id)
    if not note:
        raise HTTPException(404, "Notification not found")
    return {"success": True, "notification": notification_to_dict(note)}


@router.post("/read-all")
def mark_all_read_api(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    count = mark_all_read(db, tenant_id=user.tenant_id, user=user)
    return {"success": True, "unread": 0, "marked": count}
