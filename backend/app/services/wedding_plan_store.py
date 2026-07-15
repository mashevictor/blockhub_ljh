"""CapShip · wedding_plan 婚礼筹备。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import WeddingPlanRecord, User

VALID_STATUS = frozenset(('open', 'confirmed', 'done'))
VALID_CATEGORY = frozenset(('guest', 'vendor', 'budget'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"WP-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: WeddingPlanRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "title": row.title,
        "vendor": row.vendor,
        "budget": row.budget,
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
        db.query(WeddingPlanRecord)
        .options(joinedload(WeddingPlanRecord.reporter))
        .filter(WeddingPlanRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(WeddingPlanRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(WeddingPlanRecord.status == status)
    return [to_dict(r) for r in q.order_by(WeddingPlanRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    title: str = "",
    vendor: str = "",
    budget: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "guest").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "guest"
    row = WeddingPlanRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        title=(title or "").strip(),
        vendor=(vendor or "").strip(),
        budget=(budget or "").strip(),
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
            title="婚礼筹备 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'title', '')}",
            app_public_id=row.app_public_id,
            path="/wedding-plan",
            link_label="打开婚礼筹备",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_confirmed(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(WeddingPlanRecord)
        .options(joinedload(WeddingPlanRecord.reporter))
        .filter(WeddingPlanRecord.tenant_id == tenant_id, WeddingPlanRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "confirmed":
        return to_dict(row)
    row.status = "confirmed"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="婚礼筹备 · 已确认",
            content=f"{row.record_no} · 状态已更新为 已确认",
            app_public_id=row.app_public_id, path="/wedding-plan", link_label="打开婚礼筹备",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_done(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(WeddingPlanRecord)
        .options(joinedload(WeddingPlanRecord.reporter))
        .filter(WeddingPlanRecord.tenant_id == tenant_id, WeddingPlanRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "done":
        return to_dict(row)
    row.status = "done"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="婚礼筹备 · 完成",
            content=f"{row.record_no} · 状态已更新为 完成",
            app_public_id=row.app_public_id, path="/wedding-plan", link_label="打开婚礼筹备",
        )
    except Exception:
        pass
    return to_dict(row)

