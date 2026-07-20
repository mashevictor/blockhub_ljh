"""CapShip · ops_kpi 经营看板。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import OpsKpiRecord, User

VALID_STATUS = frozenset(('open', 'published', 'archived'))
VALID_CATEGORY = frozenset(('kpi', 'query', 'alert', 'rank', 'region'))


def _norm_category(raw: str, default: str = 'kpi') -> str:
    cat = (raw or '').strip().lower()[:64]
    return cat if cat else default


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"OK-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: OpsKpiRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "title": row.title,
        "period": row.period,
        "value": row.value,
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
        db.query(OpsKpiRecord)
        .options(joinedload(OpsKpiRecord.reporter))
        .filter(OpsKpiRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(OpsKpiRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(OpsKpiRecord.status == status)
    return [to_dict(r) for r in q.order_by(OpsKpiRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    title: str = "",
    period: str = "",
    value: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = _norm_category(category, 'kpi')
    row = OpsKpiRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        title=(title or "").strip(),
        period=(period or "").strip(),
        value=(value or "").strip(),
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
            title="经营看板 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'title', '')}",
            app_public_id=row.app_public_id,
            path="/ops-kpi",
            link_label="打开经营看板",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_published(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(OpsKpiRecord)
        .options(joinedload(OpsKpiRecord.reporter))
        .filter(OpsKpiRecord.tenant_id == tenant_id, OpsKpiRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "published":
        return to_dict(row)
    row.status = "published"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="经营看板 · 已发布",
            content=f"{row.record_no} · 状态已更新为 已发布",
            app_public_id=row.app_public_id, path="/ops-kpi", link_label="打开经营看板",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_archived(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(OpsKpiRecord)
        .options(joinedload(OpsKpiRecord.reporter))
        .filter(OpsKpiRecord.tenant_id == tenant_id, OpsKpiRecord.id == record_id)
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
            db, tenant_id=tenant_id, title="经营看板 · 归档",
            content=f"{row.record_no} · 状态已更新为 归档",
            app_public_id=row.app_public_id, path="/ops-kpi", link_label="打开经营看板",
        )
    except Exception:
        pass
    return to_dict(row)

