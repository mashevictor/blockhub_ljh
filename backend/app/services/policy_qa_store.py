"""CapShip · policy_qa 制度问答。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import PolicyQaRecord, User

VALID_STATUS = frozenset(('open', 'answered', 'archived'))
VALID_CATEGORY = frozenset(('ask', 'policy', 'benefit'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"PQ-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: PolicyQaRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "title": row.title,
        "dept": row.dept,
        "answer": row.answer,
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
        db.query(PolicyQaRecord)
        .options(joinedload(PolicyQaRecord.reporter))
        .filter(PolicyQaRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(PolicyQaRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(PolicyQaRecord.status == status)
    return [to_dict(r) for r in q.order_by(PolicyQaRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    title: str = "",
    dept: str = "",
    answer: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "ask").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "ask"
    row = PolicyQaRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        title=(title or "").strip(),
        dept=(dept or "").strip(),
        answer=(answer or "").strip(),
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
            title="制度问答 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'title', '')}",
            app_public_id=row.app_public_id,
            path="/policy-qa",
            link_label="打开制度问答",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_answered(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(PolicyQaRecord)
        .options(joinedload(PolicyQaRecord.reporter))
        .filter(PolicyQaRecord.tenant_id == tenant_id, PolicyQaRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "answered":
        return to_dict(row)
    row.status = "answered"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="制度问答 · 已答复",
            content=f"{row.record_no} · 状态已更新为 已答复",
            app_public_id=row.app_public_id, path="/policy-qa", link_label="打开制度问答",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_archived(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(PolicyQaRecord)
        .options(joinedload(PolicyQaRecord.reporter))
        .filter(PolicyQaRecord.tenant_id == tenant_id, PolicyQaRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "archived":
        return to_dict(row)
    row.status = "archived"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="制度问答 · 归档",
            content=f"{row.record_no} · 状态已更新为 归档",
            app_public_id=row.app_public_id, path="/policy-qa", link_label="打开制度问答",
        )
    except Exception:
        pass
    return to_dict(row)

