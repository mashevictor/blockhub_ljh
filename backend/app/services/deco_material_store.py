"""CapShip · deco_material 装修选材。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import DecoMaterialRecord, User

VALID_STATUS = frozenset(('open', 'accepted', 'done'))
VALID_CATEGORY = frozenset(('material', 'progress', 'budget'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"DM-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: DecoMaterialRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "material_name": row.material_name,
        "location": row.location,
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
        db.query(DecoMaterialRecord)
        .options(joinedload(DecoMaterialRecord.reporter))
        .filter(DecoMaterialRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(DecoMaterialRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(DecoMaterialRecord.status == status)
    return [to_dict(r) for r in q.order_by(DecoMaterialRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    material_name: str = "",
    location: str = "",
    budget: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "material").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "material"
    row = DecoMaterialRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        material_name=(material_name or "").strip(),
        location=(location or "").strip(),
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
            title="装修选材 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'material_name', '')}",
            app_public_id=row.app_public_id,
            path="/deco-material",
            link_label="打开装修选材",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_accepted(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(DecoMaterialRecord)
        .options(joinedload(DecoMaterialRecord.reporter))
        .filter(DecoMaterialRecord.tenant_id == tenant_id, DecoMaterialRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "accepted":
        return to_dict(row)
    row.status = "accepted"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="装修选材 · 已验收",
            content=f"{row.record_no} · 状态已更新为 已验收",
            app_public_id=row.app_public_id, path="/deco-material", link_label="打开装修选材",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_done(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(DecoMaterialRecord)
        .options(joinedload(DecoMaterialRecord.reporter))
        .filter(DecoMaterialRecord.tenant_id == tenant_id, DecoMaterialRecord.id == record_id)
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
            db, tenant_id=tenant_id, title="装修选材 · 完成",
            content=f"{row.record_no} · 状态已更新为 完成",
            app_public_id=row.app_public_id, path="/deco-material", link_label="打开装修选材",
        )
    except Exception:
        pass
    return to_dict(row)

