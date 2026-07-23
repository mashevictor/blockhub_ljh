"""CapShip · hotel_ops 共享记录。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.models import HotelOpsRecord, User

KINDS = frozenset(
    {
        "guest_complaint",
        "food_purchase",
        "hygiene_check",
        "room_service",
        "banquet_order",
        "hotel_revenue",
        "fnb_order",
        "lost_found",
        "room_status",
        "hk_task",
        "minibar_charge",
        "concierge_req",
        "group_checkin",
        "night_audit",
        "table_reserve",
        "menu_86",
        "kitchen_waste",
        "allergen_note"
    }
)
VALID_STATUS = frozenset({"open", "done", "approved", "rejected", "closed"})
PREFIX = {
    "guest_complaint": "GC",
    "food_purchase": "FP",
    "hygiene_check": "HC",
    "room_service": "RS",
    "banquet_order": "BO",
    "hotel_revenue": "HR",
    "fnb_order": "FO",
    "lost_found": "LF",
    "room_status": "RM",
    "hk_task": "HK",
    "minibar_charge": "MB",
    "concierge_req": "CQ",
    "group_checkin": "GI",
    "night_audit": "NA",
    "table_reserve": "TR",
    "menu_86": "M86",
    "kitchen_waste": "KW",
    "allergen_note": "AN"
}
KIND_LABEL = {
    "guest_complaint": "客诉处理",
    "food_purchase": "食材申购",
    "hygiene_check": "卫生检查",
    "room_service": "客房服务",
    "banquet_order": "宴会预订",
    "hotel_revenue": "营收日报",
    "fnb_order": "餐饮点单",
    "lost_found": "失物招领",
    "room_status": "房态变更",
    "hk_task": "客房打扫",
    "minibar_charge": "迷你吧计费",
    "concierge_req": "礼宾需求",
    "group_checkin": "团队入住",
    "night_audit": "夜审确认",
    "table_reserve": "餐厅订位",
    "menu_86": "菜品沽清",
    "kitchen_waste": "厨余报损",
    "allergen_note": "过敏原工单"
}


def _no(kind: str) -> str:
    now = datetime.now(timezone.utc)
    p = PREFIX.get(kind, "HT")
    return f"{p}-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: HotelOpsRecord) -> dict[str, Any]:
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
        db.query(HotelOpsRecord)
        .options(joinedload(HotelOpsRecord.reporter))
        .filter(HotelOpsRecord.tenant_id == tenant_id, HotelOpsRecord.kind == kind)
    )
    if app_public_id:
        q = q.filter(HotelOpsRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(HotelOpsRecord.status == status)
    return [to_dict(r) for r in q.order_by(HotelOpsRecord.created_at.desc()).limit(200).all()]


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
    row = HotelOpsRecord(
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
        db.query(HotelOpsRecord)
        .options(joinedload(HotelOpsRecord.reporter))
        .filter(HotelOpsRecord.id == row.id)
        .first()
    )
    try:
        from app.services.im_delivery_service import notify_business_event

        label = KIND_LABEL.get(kind, kind)
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title=f"{label} · 新提交",
            content=f"{row.record_no} · {row.title}\n{(row.note or row.field_a or '')[:160]}",
            app_public_id=row.app_public_id,
            path=f"/{kind.replace('_', '-')}",
            link_label=f"打开{label}",
        )
    except Exception:
        pass
    return to_dict(row)  # type: ignore[arg-type]


def set_status(db: Session, tenant_id: str, record_id: str, status: str) -> dict[str, Any] | None:
    if status not in VALID_STATUS:
        return None
    row = (
        db.query(HotelOpsRecord)
        .options(joinedload(HotelOpsRecord.reporter))
        .filter(HotelOpsRecord.id == record_id, HotelOpsRecord.tenant_id == tenant_id)
        .first()
    )
    if not row:
        return None
    row.status = status
    db.add(row)
    db.commit()
    db.refresh(row)
    return to_dict(row)


def stats(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
) -> dict[str, Any]:
    q = db.query(HotelOpsRecord.kind, HotelOpsRecord.status, func.count()).filter(
        HotelOpsRecord.tenant_id == tenant_id
    )
    if app_public_id:
        q = q.filter(HotelOpsRecord.app_public_id == app_public_id)
    rows = q.group_by(HotelOpsRecord.kind, HotelOpsRecord.status).all()
    by_kind: dict[str, dict[str, int]] = {k: {"open": 0, "done": 0, "total": 0} for k in sorted(KINDS)}
    total_open = 0
    total_all = 0
    for kind, status, cnt in rows:
        n = int(cnt or 0)
        if kind not in by_kind:
            by_kind[kind] = {"open": 0, "done": 0, "total": 0}
        by_kind[kind]["total"] += n
        total_all += n
        if status == "open":
            by_kind[kind]["open"] += n
            total_open += n
        else:
            by_kind[kind]["done"] += n
    cards = [
        {"key": k, "label": KIND_LABEL.get(k, k), "open": by_kind[k]["open"], "total": by_kind[k]["total"]}
        for k in sorted(KINDS)
    ]
    return {
        "metrics_source": "hotel_ops",
        "total": total_all,
        "open": total_open,
        "cards": cards,
        "complaint_open": by_kind.get("guest_complaint", {}).get("open", 0),
        "purchase_open": by_kind.get("food_purchase", {}).get("open", 0),
        "hygiene_open": by_kind.get("hygiene_check", {}).get("open", 0),
        "hk_open": by_kind.get("hk_task", {}).get("open", 0),
        "table_open": by_kind.get("table_reserve", {}).get("open", 0),
    }
