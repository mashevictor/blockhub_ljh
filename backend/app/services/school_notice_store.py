"""CapShip · school_notice 家校通知。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import SchoolNoticeRecord, User

VALID_STATUS = frozenset({"published", "acked"})
VALID_CATEGORY = frozenset({"notice", "signup", "message"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"SN-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: SchoolNoticeRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "title": row.title,
        "audience": row.audience,
        "category": row.category,
        "content": row.content,
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
        db.query(SchoolNoticeRecord)
        .options(joinedload(SchoolNoticeRecord.reporter))
        .filter(SchoolNoticeRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(SchoolNoticeRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(SchoolNoticeRecord.status == status)
    return [to_dict(r) for r in q.order_by(SchoolNoticeRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    title: str,
    content: str = "",
    audience: str = "",
    category: str = "notice",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "notice").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "notice"
    row = SchoolNoticeRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        title=(title or "").strip() or "未填标题",
        audience=(audience or "").strip() or "全班家长",
        category=cat,
        content=(content or "").strip(),
        status="published",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event

        kind = {"notice": "通知", "signup": "报名", "message": "留言"}.get(cat, "通知")
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title=f"家校{kind} · 已发布",
            content=f"{row.record_no} · {row.audience}\n{row.title}\n{(row.content or '')[:160]}",
            app_public_id=row.app_public_id,
            path="/school-notice",
            link_label="打开家校通知",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_acked(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(SchoolNoticeRecord)
        .options(joinedload(SchoolNoticeRecord.reporter))
        .filter(SchoolNoticeRecord.tenant_id == tenant_id, SchoolNoticeRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "acked":
        return to_dict(row)
    row.status = "acked"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="家校通知 · 已回执",
            content=f"{row.record_no} · {row.title} · 家长已确认",
            app_public_id=row.app_public_id,
            path="/school-notice",
            link_label="打开家校通知",
        )
    except Exception:
        pass
    return to_dict(row)
