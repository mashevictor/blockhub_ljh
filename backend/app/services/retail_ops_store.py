"""CapShip · retail_ops 共享记录。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.models import RetailOpsRecord, User

KINDS = frozenset(
    {
        "stock_alert",
        "retail_order",
        "return_exchange",
        "supplier_recon",
        "price_change",
        "display_check",
        "shelf_replenish",
        "pos_exception",
        "store_transfer",
        "loss_shrinkage",
        "omni_pickup",
        "promo_coupon",
        "gift_card",
        "competitor_price",
        "new_sku_launch",
        "vip_hold",
        "receipt_audit",
        "online_refund"
    }
)
VALID_STATUS = frozenset({"open", "done", "approved", "rejected", "closed"})
PREFIX = {
    "stock_alert": "SA",
    "retail_order": "RO",
    "return_exchange": "RX",
    "supplier_recon": "SR",
    "price_change": "PC",
    "display_check": "DC",
    "shelf_replenish": "SP",
    "pos_exception": "PE",
    "store_transfer": "ST",
    "loss_shrinkage": "LS",
    "omni_pickup": "OP",
    "promo_coupon": "CU",
    "gift_card": "GC",
    "competitor_price": "CP",
    "new_sku_launch": "NL",
    "vip_hold": "VH",
    "receipt_audit": "RA",
    "online_refund": "OR"
}
KIND_LABEL = {
    "stock_alert": "库存预警",
    "retail_order": "订单跟踪",
    "return_exchange": "退换货",
    "supplier_recon": "供应商对账",
    "price_change": "价格变更",
    "display_check": "陈列检查",
    "shelf_replenish": "补货上架",
    "pos_exception": "收银异常",
    "store_transfer": "门店调拨",
    "loss_shrinkage": "损耗报损",
    "omni_pickup": "全渠道自提",
    "promo_coupon": "优惠券核销",
    "gift_card": "储值卡充值",
    "competitor_price": "竞品采价",
    "new_sku_launch": "新品上架",
    "vip_hold": "会员预留",
    "receipt_audit": "小票稽核",
    "online_refund": "电商仅退款"
}


def _no(kind: str) -> str:
    now = datetime.now(timezone.utc)
    p = PREFIX.get(kind, "RT")
    return f"{p}-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: RetailOpsRecord) -> dict[str, Any]:
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
        db.query(RetailOpsRecord)
        .options(joinedload(RetailOpsRecord.reporter))
        .filter(RetailOpsRecord.tenant_id == tenant_id, RetailOpsRecord.kind == kind)
    )
    if app_public_id:
        q = q.filter(RetailOpsRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(RetailOpsRecord.status == status)
    return [to_dict(r) for r in q.order_by(RetailOpsRecord.created_at.desc()).limit(200).all()]


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
    row = RetailOpsRecord(
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
        db.query(RetailOpsRecord)
        .options(joinedload(RetailOpsRecord.reporter))
        .filter(RetailOpsRecord.id == row.id)
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
        db.query(RetailOpsRecord)
        .options(joinedload(RetailOpsRecord.reporter))
        .filter(RetailOpsRecord.id == record_id, RetailOpsRecord.tenant_id == tenant_id)
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
    q = db.query(RetailOpsRecord.kind, RetailOpsRecord.status, func.count()).filter(
        RetailOpsRecord.tenant_id == tenant_id
    )
    if app_public_id:
        q = q.filter(RetailOpsRecord.app_public_id == app_public_id)
    rows = q.group_by(RetailOpsRecord.kind, RetailOpsRecord.status).all()
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
        "metrics_source": "retail_ops",
        "total": total_all,
        "open": total_open,
        "cards": cards,
        "stock_open": by_kind.get("stock_alert", {}).get("open", 0),
        "order_open": by_kind.get("retail_order", {}).get("open", 0),
        "return_open": by_kind.get("return_exchange", {}).get("open", 0),
        "transfer_open": by_kind.get("store_transfer", {}).get("open", 0),
        "pickup_open": by_kind.get("omni_pickup", {}).get("open", 0),
    }
