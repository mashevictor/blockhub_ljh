"""CapShip · site_patrol 巡检打卡。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import SitePatrolRecord, User

VALID_STATUS = frozenset({"open", "closed"})
VALID_RESULT = frozenset({"ok", "issue"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"PT-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: SitePatrolRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "site_name": row.site_name,
        "checkpoint": row.checkpoint,
        "result": row.result,
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
        db.query(SitePatrolRecord)
        .options(joinedload(SitePatrolRecord.reporter))
        .filter(SitePatrolRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(SitePatrolRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(SitePatrolRecord.status == status)
    return [to_dict(r) for r in q.order_by(SitePatrolRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    site_name: str,
    checkpoint: str = "",
    result: str = "ok",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    res = (result or "ok").strip().lower()
    if res not in VALID_RESULT:
        res = "ok"
    row = SitePatrolRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        site_name=(site_name or "").strip() or "未填站点",
        checkpoint=(checkpoint or "").strip() or "未填检查点",
        result=res,
        note=(note or "").strip(),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event

        label = "正常" if res == "ok" else "异常"
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title=f"巡检打卡 · {label}",
            content=(
                f"{row.record_no} · {row.site_name} · {row.checkpoint}\n"
                f"结果：{label}\n{(row.note or '')[:160]}"
            ),
            app_public_id=row.app_public_id,
            path="/site-patrol",
            link_label="打开巡检打卡",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_closed(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(SitePatrolRecord)
        .options(joinedload(SitePatrolRecord.reporter))
        .filter(SitePatrolRecord.tenant_id == tenant_id, SitePatrolRecord.id == record_id)
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
            db,
            tenant_id=tenant_id,
            title="巡检打卡 · 已关闭",
            content=f"{row.record_no} · {row.site_name} · {row.checkpoint} · 已关闭",
            app_public_id=row.app_public_id,
            path="/site-patrol",
            link_label="打开巡检打卡",
        )
    except Exception:
        pass
    return to_dict(row)
