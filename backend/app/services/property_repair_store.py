"""CapShip · property_repair 物业报修。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import PropertyRepairRecord, User

VALID_STATUS = frozenset({"open", "dispatched", "done"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"PR-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: PropertyRepairRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "location": row.location,
        "asset_name": row.asset_name,
        "fault": row.fault,
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
        db.query(PropertyRepairRecord)
        .options(joinedload(PropertyRepairRecord.reporter))
        .filter(PropertyRepairRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(PropertyRepairRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(PropertyRepairRecord.status == status)
    return [to_dict(r) for r in q.order_by(PropertyRepairRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    location: str,
    asset_name: str = "",
    fault: str,
    app_public_id: str = "",
) -> dict[str, Any]:
    row = PropertyRepairRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        location=(location or "").strip() or "未填位置",
        asset_name=(asset_name or "").strip() or "未填资产",
        fault=(fault or "").strip(),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event

        reporter = user.display_name or user.email or "报修人"
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title="物业报修 · 待派工",
            content=(
                f"{row.record_no} · {row.location} · {row.asset_name}\n"
                f"{row.fault[:200]}\n报修人：{reporter}"
            ),
            app_public_id=row.app_public_id,
            path="/property-repair",
            link_label="打开物业报修",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_dispatched(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(PropertyRepairRecord)
        .options(joinedload(PropertyRepairRecord.reporter))
        .filter(PropertyRepairRecord.tenant_id == tenant_id, PropertyRepairRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status != "open":
        return to_dict(row)
    row.status = "dispatched"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="物业报修 · 已派工",
            content=f"{row.record_no} · {row.location} · {row.asset_name} · 已派工处理",
            app_public_id=row.app_public_id,
            path="/property-repair",
            link_label="打开物业报修",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_done(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(PropertyRepairRecord)
        .options(joinedload(PropertyRepairRecord.reporter))
        .filter(PropertyRepairRecord.tenant_id == tenant_id, PropertyRepairRecord.id == record_id)
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
            db,
            tenant_id=tenant_id,
            title="物业报修 · 已完工",
            content=f"{row.record_no} · {row.location} · {row.asset_name} · 维修完成",
            app_public_id=row.app_public_id,
            path="/property-repair",
            link_label="打开物业报修",
        )
    except Exception:
        pass
    return to_dict(row)
