"""CapShip · campaign_ops 活动运营。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import CampaignOpsRecord, User

VALID_STATUS = frozenset(('open', 'running', 'closed'))
VALID_CATEGORY = frozenset(('plan', 'signup', 'review'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"CO-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: CampaignOpsRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "title": row.title,
        "channel": row.channel,
        "metric": row.metric,
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
        db.query(CampaignOpsRecord)
        .options(joinedload(CampaignOpsRecord.reporter))
        .filter(CampaignOpsRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(CampaignOpsRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(CampaignOpsRecord.status == status)
    return [to_dict(r) for r in q.order_by(CampaignOpsRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    title: str = "",
    channel: str = "",
    metric: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "plan").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "plan"
    row = CampaignOpsRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        title=(title or "").strip(),
        channel=(channel or "").strip(),
        metric=(metric or "").strip(),
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
            title="活动运营 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'title', '')}",
            app_public_id=row.app_public_id,
            path="/campaign-ops",
            link_label="打开活动运营",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_running(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(CampaignOpsRecord)
        .options(joinedload(CampaignOpsRecord.reporter))
        .filter(CampaignOpsRecord.tenant_id == tenant_id, CampaignOpsRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "running":
        return to_dict(row)
    row.status = "running"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="活动运营 · 进行中",
            content=f"{row.record_no} · 状态已更新为 进行中",
            app_public_id=row.app_public_id, path="/campaign-ops", link_label="打开活动运营",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_closed(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(CampaignOpsRecord)
        .options(joinedload(CampaignOpsRecord.reporter))
        .filter(CampaignOpsRecord.tenant_id == tenant_id, CampaignOpsRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "closed":
        return to_dict(row)
    row.status = "closed"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="活动运营 · 关闭",
            content=f"{row.record_no} · 状态已更新为 关闭",
            app_public_id=row.app_public_id, path="/campaign-ops", link_label="打开活动运营",
        )
    except Exception:
        pass
    return to_dict(row)

