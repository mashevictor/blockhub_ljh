"""CapShip · pet_clinic 宠物问诊。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import PetClinicRecord, User

VALID_STATUS = frozenset(('open', 'scheduled', 'done'))
VALID_CATEGORY = frozenset(('consult', 'visit', 'vaccine'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"PC-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: PetClinicRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "pet_name": row.pet_name,
        "symptom": row.symptom,
        "schedule_at": row.schedule_at,
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
        db.query(PetClinicRecord)
        .options(joinedload(PetClinicRecord.reporter))
        .filter(PetClinicRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(PetClinicRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(PetClinicRecord.status == status)
    return [to_dict(r) for r in q.order_by(PetClinicRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    pet_name: str = "",
    symptom: str = "",
    schedule_at: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "consult").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "consult"
    row = PetClinicRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        pet_name=(pet_name or "").strip(),
        symptom=(symptom or "").strip(),
        schedule_at=(schedule_at or "").strip(),
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
            title="宠物问诊 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'symptom', '')}",
            app_public_id=row.app_public_id,
            path="/pet-clinic",
            link_label="打开宠物问诊",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_scheduled(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(PetClinicRecord)
        .options(joinedload(PetClinicRecord.reporter))
        .filter(PetClinicRecord.tenant_id == tenant_id, PetClinicRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "scheduled":
        return to_dict(row)
    row.status = "scheduled"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="宠物问诊 · 已预约",
            content=f"{row.record_no} · 状态已更新为 已预约",
            app_public_id=row.app_public_id, path="/pet-clinic", link_label="打开宠物问诊",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_done(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(PetClinicRecord)
        .options(joinedload(PetClinicRecord.reporter))
        .filter(PetClinicRecord.tenant_id == tenant_id, PetClinicRecord.id == record_id)
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
            db, tenant_id=tenant_id, title="宠物问诊 · 完成",
            content=f"{row.record_no} · 状态已更新为 完成",
            app_public_id=row.app_public_id, path="/pet-clinic", link_label="打开宠物问诊",
        )
    except Exception:
        pass
    return to_dict(row)

