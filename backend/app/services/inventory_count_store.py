"""CapShip · inventory_count 库存盘点。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import InventoryCountRecord, User

VALID_STATUS = frozenset({"pending", "confirmed"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"IC-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: InventoryCountRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "location": row.location,
        "sku_code": row.sku_code,
        "qty": int(row.qty or 0),
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
        db.query(InventoryCountRecord)
        .options(joinedload(InventoryCountRecord.reporter))
        .filter(InventoryCountRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(InventoryCountRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(InventoryCountRecord.status == status)
    return [to_dict(r) for r in q.order_by(InventoryCountRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    location: str,
    sku_code: str,
    qty: int,
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    row = InventoryCountRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        location=(location or "").strip() or "未填货位",
        sku_code=sku_code.strip(),
        qty=max(0, int(qty)),
        note=(note or "").strip(),
        status="pending",
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
            title="盘点录入 · 待确认",
            content=(
                f"{row.record_no} · {row.sku_code} @ {row.location}\n"
                f"数量：{row.qty}\n{(row.note or '')[:160]}"
            ),
            app_public_id=row.app_public_id,
            path="/inventory-count",
            link_label="打开盘点",
        )
    except Exception:
        pass
    return to_dict(row)


def confirm_record(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(InventoryCountRecord)
        .options(joinedload(InventoryCountRecord.reporter))
        .filter(InventoryCountRecord.tenant_id == tenant_id, InventoryCountRecord.id == record_id)
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
            db,
            tenant_id=tenant_id,
            title="盘点已确认",
            content=f"{row.record_no} · {row.sku_code} · qty={row.qty} · 已入库确认",
            app_public_id=row.app_public_id,
            path="/inventory-count",
            link_label="打开盘点",
        )
    except Exception:
        pass
    return to_dict(row)
