"""CapShip · hire_onboard 招聘入职。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import HireOnboardRecord, User

VALID_STATUS = frozenset(('open', 'interview', 'offered', 'joined'))
VALID_CATEGORY = frozenset(('job', 'resume', 'onboard'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"HO-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: HireOnboardRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "candidate": row.candidate,
        "stage": row.stage,
        "owner": row.owner,
        "note": row.note,
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
        db.query(HireOnboardRecord)
        .options(joinedload(HireOnboardRecord.reporter))
        .filter(HireOnboardRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(HireOnboardRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(HireOnboardRecord.status == status)
    return [to_dict(r) for r in q.order_by(HireOnboardRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    candidate: str = "",
    stage: str = "",
    owner: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "job").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "job"
    row = HireOnboardRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        candidate=(candidate or "").strip(),
        stage=(stage or "").strip(),
        owner=(owner or "").strip(),
        note=(note or "").strip(),
        status="open",
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
            title="招聘入职 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'candidate', '')}",
            app_public_id=row.app_public_id,
            path="/hire-onboard",
            link_label="打开招聘入职",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_interview(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(HireOnboardRecord)
        .options(joinedload(HireOnboardRecord.reporter))
        .filter(HireOnboardRecord.tenant_id == tenant_id, HireOnboardRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "interview":
        return to_dict(row)
    row.status = "interview"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="招聘入职 · 面试",
            content=f"{row.record_no} · 状态已更新为 面试",
            app_public_id=row.app_public_id, path="/hire-onboard", link_label="打开招聘入职",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_offered(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(HireOnboardRecord)
        .options(joinedload(HireOnboardRecord.reporter))
        .filter(HireOnboardRecord.tenant_id == tenant_id, HireOnboardRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "offered":
        return to_dict(row)
    row.status = "offered"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="招聘入职 · Offer",
            content=f"{row.record_no} · 状态已更新为 Offer",
            app_public_id=row.app_public_id, path="/hire-onboard", link_label="打开招聘入职",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_joined(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(HireOnboardRecord)
        .options(joinedload(HireOnboardRecord.reporter))
        .filter(HireOnboardRecord.tenant_id == tenant_id, HireOnboardRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "joined":
        return to_dict(row)
    row.status = "joined"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="招聘入职 · 已入职",
            content=f"{row.record_no} · 状态已更新为 已入职",
            app_public_id=row.app_public_id, path="/hire-onboard", link_label="打开招聘入职",
        )
    except Exception:
        pass
    return to_dict(row)

