"""CapShip · 多行业 vertical_ops 共享记录。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.data.vertical_ops_catalog import VERTICAL_OPS, all_kind_keys, kind_industry, kind_meta
from app.db.models import User, VerticalOpsRecord

KINDS = frozenset(all_kind_keys())
VALID_STATUS = frozenset({"open", "done", "approved", "rejected", "closed"})


def _no(kind: str) -> str:
    meta = kind_meta(kind) or {}
    p = str(meta.get("prefix") or "VO")
    now = datetime.now(timezone.utc)
    return f"{p}-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: VerticalOpsRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "industry_key": row.industry_key,
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
    industry_key: str | None = None,
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    if kind not in KINDS:
        return []
    ind = industry_key or kind_industry(kind)
    q = (
        db.query(VerticalOpsRecord)
        .options(joinedload(VerticalOpsRecord.reporter))
        .filter(VerticalOpsRecord.tenant_id == tenant_id, VerticalOpsRecord.kind == kind)
    )
    if ind:
        q = q.filter(VerticalOpsRecord.industry_key == ind)
    if app_public_id:
        q = q.filter(VerticalOpsRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(VerticalOpsRecord.status == status)
    return [to_dict(r) for r in q.order_by(VerticalOpsRecord.created_at.desc()).limit(200).all()]


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
    industry_key: str = "",
) -> dict[str, Any]:
    if kind not in KINDS:
        raise ValueError(f"unsupported kind: {kind}")
    ind = (industry_key or kind_industry(kind) or "").strip()
    if not ind or ind not in VERTICAL_OPS:
        raise ValueError(f"unsupported industry for kind: {kind}")
    row = VerticalOpsRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(kind),
        industry_key=ind,
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
        db.query(VerticalOpsRecord)
        .options(joinedload(VerticalOpsRecord.reporter))
        .filter(VerticalOpsRecord.id == row.id)
        .first()
    )
    try:
        from app.services.im_delivery_service import notify_business_event

        meta = kind_meta(kind) or {}
        label = str(meta.get("name") or kind)
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
        db.query(VerticalOpsRecord)
        .options(joinedload(VerticalOpsRecord.reporter))
        .filter(VerticalOpsRecord.id == record_id, VerticalOpsRecord.tenant_id == tenant_id)
        .first()
    )
    if not row:
        return None
    row.status = status
    db.add(row)
    db.commit()
    db.refresh(row)
    return to_dict(row)


def stats(db: Session, tenant_id: str, *, app_public_id: str | None = None) -> dict[str, Any]:
    q = db.query(VerticalOpsRecord.kind, func.count()).filter(VerticalOpsRecord.tenant_id == tenant_id)
    if app_public_id:
        q = q.filter(VerticalOpsRecord.app_public_id == app_public_id)
    by_kind = {k: c for k, c in q.group_by(VerticalOpsRecord.kind).all()}
    return {"by_kind": by_kind, "total": sum(by_kind.values())}
