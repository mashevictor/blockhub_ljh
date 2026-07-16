"""CapShip · 制造场景专用记录（OEE/领料/保养/排班/能耗/培训）。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import MfgOpsRecord, User

KINDS = frozenset(
    {
        "mfg_oee",
        "material_issue",
        "maintenance_plan",
        "shift_attendance",
        "energy_carbon",
        "training_record",
    }
)
VALID_STATUS = frozenset({"open", "done", "approved", "rejected"})
PREFIX = {
    "mfg_oee": "OEE",
    "material_issue": "MI",
    "maintenance_plan": "MP",
    "shift_attendance": "SA",
    "energy_carbon": "EC",
    "training_record": "TR",
}


def _no(kind: str) -> str:
    now = datetime.now(timezone.utc)
    p = PREFIX.get(kind, "MF")
    return f"{p}-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: MfgOpsRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "kind": row.kind,
        "app_public_id": row.app_public_id,
        "title": row.title,
        "field_a": row.field_a,
        "field_b": row.field_b,
        "field_c": row.field_c,
        "field_d": row.field_d,
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
    kind: str,
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    if kind not in KINDS:
        return []
    q = (
        db.query(MfgOpsRecord)
        .options(joinedload(MfgOpsRecord.reporter))
        .filter(MfgOpsRecord.tenant_id == tenant_id, MfgOpsRecord.kind == kind)
    )
    if app_public_id:
        q = q.filter(MfgOpsRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(MfgOpsRecord.status == status)
    return [to_dict(r) for r in q.order_by(MfgOpsRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    kind: str,
    title: str,
    field_a: str = "",
    field_b: str = "",
    field_c: str = "",
    field_d: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    if kind not in KINDS:
        raise ValueError(f"unsupported kind: {kind}")
    row = MfgOpsRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(kind),
        kind=kind,
        title=(title or "").strip() or "未命名",
        field_a=(field_a or "").strip(),
        field_b=(field_b or "").strip(),
        field_c=(field_c or "").strip(),
        field_d=(field_d or "").strip(),
        note=(note or "").strip(),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = (
        db.query(MfgOpsRecord)
        .options(joinedload(MfgOpsRecord.reporter))
        .filter(MfgOpsRecord.id == row.id)
        .first()
    )
    return to_dict(row)  # type: ignore[arg-type]


def set_status(db: Session, tenant_id: str, record_id: str, status: str) -> dict[str, Any] | None:
    if status not in VALID_STATUS:
        return None
    row = (
        db.query(MfgOpsRecord)
        .options(joinedload(MfgOpsRecord.reporter))
        .filter(MfgOpsRecord.id == record_id, MfgOpsRecord.tenant_id == tenant_id)
        .first()
    )
    if not row:
        return None
    row.status = status
    db.add(row)
    db.commit()
    db.refresh(row)
    return to_dict(row)
