"""CapShip · 物流仓储共享记录（运单/入出库/调度/签收/异常/运费/冷链/装卸/路线）。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.models import LogisticsOpsRecord, User

KINDS = frozenset(
    {
        "waybill_track",
        "warehouse_inbound",
        "warehouse_outbound",
        "fleet_dispatch",
        "pod_signoff",
        "logistics_exception",
        "freight_settle",
        "cold_chain_alert",
        "dock_queue",
        "route_task",
    }
)
VALID_STATUS = frozenset({"open", "done", "approved", "rejected", "closed"})
PREFIX = {
    "waybill_track": "WB",
    "warehouse_inbound": "IN",
    "warehouse_outbound": "OUT",
    "fleet_dispatch": "FD",
    "pod_signoff": "POD",
    "logistics_exception": "EX",
    "freight_settle": "FS",
    "cold_chain_alert": "CC",
    "dock_queue": "DQ",
    "route_task": "RT",
}
KIND_LABEL = {
    "waybill_track": "运单跟踪",
    "warehouse_inbound": "入库验收",
    "warehouse_outbound": "出库拣配",
    "fleet_dispatch": "车辆调度",
    "pod_signoff": "签收确认",
    "logistics_exception": "异常上报",
    "freight_settle": "运费结算",
    "cold_chain_alert": "冷链告警",
    "dock_queue": "装卸排队",
    "route_task": "路线任务",
}


def _no(kind: str) -> str:
    now = datetime.now(timezone.utc)
    p = PREFIX.get(kind, "LG")
    return f"{p}-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: LogisticsOpsRecord) -> dict[str, Any]:
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
        db.query(LogisticsOpsRecord)
        .options(joinedload(LogisticsOpsRecord.reporter))
        .filter(LogisticsOpsRecord.tenant_id == tenant_id, LogisticsOpsRecord.kind == kind)
    )
    if app_public_id:
        q = q.filter(LogisticsOpsRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(LogisticsOpsRecord.status == status)
    return [to_dict(r) for r in q.order_by(LogisticsOpsRecord.created_at.desc()).limit(200).all()]


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
    row = LogisticsOpsRecord(
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
        db.query(LogisticsOpsRecord)
        .options(joinedload(LogisticsOpsRecord.reporter))
        .filter(LogisticsOpsRecord.id == row.id)
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
        db.query(LogisticsOpsRecord)
        .options(joinedload(LogisticsOpsRecord.reporter))
        .filter(LogisticsOpsRecord.id == record_id, LogisticsOpsRecord.tenant_id == tenant_id)
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
    """本租户物流真计数聚合；空库全 0。"""
    q = db.query(LogisticsOpsRecord.kind, LogisticsOpsRecord.status, func.count()).filter(
        LogisticsOpsRecord.tenant_id == tenant_id
    )
    if app_public_id:
        q = q.filter(LogisticsOpsRecord.app_public_id == app_public_id)
    rows = q.group_by(LogisticsOpsRecord.kind, LogisticsOpsRecord.status).all()
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
        "metrics_source": "logistics_ops",
        "total": total_all,
        "open": total_open,
        "cards": cards,
        "waybill_open": by_kind.get("waybill_track", {}).get("open", 0),
        "exception_open": by_kind.get("logistics_exception", {}).get("open", 0),
        "cold_open": by_kind.get("cold_chain_alert", {}).get("open", 0),
    }
