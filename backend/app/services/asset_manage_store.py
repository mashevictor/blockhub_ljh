"""CapShip · asset_manage 资产领用/盘点持久化。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import AssetManageRecord, User


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"AS-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: AssetManageRecord) -> dict[str, Any]:
    reporter_name = ""
    if row.reporter is not None:
        reporter_name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "asset_name": row.asset_name,
        "asset_code": row.asset_code,
        "quantity": row.quantity,
        "note": row.note,
        "status": row.status,
        "reporter_name": reporter_name,
        "created_at": row.created_at.isoformat() if row.created_at else "",
    }


def list_records(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query(AssetManageRecord)
        .options(joinedload(AssetManageRecord.reporter))
        .filter(AssetManageRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(AssetManageRecord.app_public_id == app_public_id)
    if status:
        q = q.filter(AssetManageRecord.status == status)
    return [to_dict(r) for r in q.order_by(AssetManageRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str,
    asset_name: str,
    asset_code: str = "",
    quantity: str = "1",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    row = AssetManageRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=(category or "borrow").strip()[:32],
        asset_name=(asset_name or "").strip()[:200],
        asset_code=(asset_code or "").strip()[:120],
        quantity=(quantity or "1").strip()[:32],
        note=(note or "").strip(),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = (
        db.query(AssetManageRecord)
        .options(joinedload(AssetManageRecord.reporter))
        .filter(AssetManageRecord.id == row.id)
        .one()
    )
    return to_dict(row)


def advance(db: Session, tenant_id: str, record_id: str, action: str) -> dict[str, Any] | None:
    row = (
        db.query(AssetManageRecord)
        .options(joinedload(AssetManageRecord.reporter))
        .filter(AssetManageRecord.id == record_id, AssetManageRecord.tenant_id == tenant_id)
        .first()
    )
    if not row:
        return None
    mapping = {
        "approved": "approved",
        "rejected": "rejected",
        "returned": "returned",
        "done": "done",
    }
    nxt = mapping.get(action)
    if nxt:
        row.status = nxt
        db.commit()
        db.refresh(row)
    return to_dict(row)
