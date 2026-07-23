from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services.email_service import send_email, smtp_configured
from app.services.notification_service import (
    create_notification,
    list_notifications,
    mark_all_read,
    mark_read,
    notification_to_dict,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class EmailBody(BaseModel):
    to: str = Field(min_length=3, max_length=200)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=8000)


@router.get("")
def list_notifications_api(
    read: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = list_notifications(db, tenant_id=user.tenant_id, user=user, read=read)
    unread = sum(1 for n in items if not n.read)
    return {"total": len(items), "unread": unread, "items": [notification_to_dict(n) for n in items]}


@router.post("/email")
def send_email_notification(
    body: EmailBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """邮件通知：必写入 notifications 真表；SMTP 已配置时尝试外发。"""
    to = body.to.strip()
    subject = body.subject.strip()
    content = body.body.strip()
    if "@" not in to:
        raise HTTPException(status_code=400, detail="收件人须为邮箱地址")

    note = create_notification(
        db,
        tenant_id=user.tenant_id,
        title=f"[邮件] {subject}",
        content=f"收件人：{to}\n\n{content}",
        type="email",
        recipient_user_id=user.id,
    )
    smtp_ok = False
    smtp_err = ""
    if smtp_configured():
        try:
            smtp_ok = bool(send_email(to=to, subject=subject, text=content))
        except Exception as exc:  # noqa: BLE001
            smtp_err = str(exc)[:300]
    if smtp_configured():
        msg = "已外发邮件并写入站内通知" if smtp_ok else f"已写入站内通知，外发失败：{smtp_err or '未知错误'}"
    else:
        msg = "已写入站内通知（未配置 SMTP，未外发）"
    return {
        "success": True,
        "smtp": smtp_ok,
        "message": msg,
        "notification": notification_to_dict(note),
    }


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
