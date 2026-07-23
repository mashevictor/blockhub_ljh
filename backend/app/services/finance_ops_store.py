"""CapShip · 金融五垂直共享记录（KYC/AML/授信/尽调/报送/核保理赔）。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.models import FinanceOpsRecord, User

KINDS = frozenset(
    {
        "finance_kyc",
        "finance_aml",
        "credit_approval",
        "due_diligence",
        "regulatory_report",
        "insurance_case",
    }
)
VALID_STATUS = frozenset({"open", "done", "approved", "rejected", "closed"})
PREFIX = {
    "finance_kyc": "KYC",
    "finance_aml": "AML",
    "credit_approval": "CR",
    "due_diligence": "DD",
    "regulatory_report": "RR",
    "insurance_case": "INS",
}
KIND_LABEL = {
    "finance_kyc": "金融KYC",
    "finance_aml": "反洗钱监测",
    "credit_approval": "授信审批",
    "due_diligence": "尽调报告",
    "regulatory_report": "监管报送",
    "insurance_case": "保险核保理赔",
}


def _no(kind: str) -> str:
    now = datetime.now(timezone.utc)
    p = PREFIX.get(kind, "FIN")
    return f"{p}-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: FinanceOpsRecord) -> dict[str, Any]:
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
        db.query(FinanceOpsRecord)
        .options(joinedload(FinanceOpsRecord.reporter))
        .filter(FinanceOpsRecord.tenant_id == tenant_id, FinanceOpsRecord.kind == kind)
    )
    if app_public_id:
        q = q.filter(FinanceOpsRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(FinanceOpsRecord.status == status)
    return [to_dict(r) for r in q.order_by(FinanceOpsRecord.created_at.desc()).limit(200).all()]


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
    row = FinanceOpsRecord(
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
        db.query(FinanceOpsRecord)
        .options(joinedload(FinanceOpsRecord.reporter))
        .filter(FinanceOpsRecord.id == row.id)
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
        db.query(FinanceOpsRecord)
        .options(joinedload(FinanceOpsRecord.reporter))
        .filter(FinanceOpsRecord.id == record_id, FinanceOpsRecord.tenant_id == tenant_id)
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
    """本租户金融真计数聚合；空库全 0。"""
    q = db.query(FinanceOpsRecord.kind, FinanceOpsRecord.status, func.count()).filter(
        FinanceOpsRecord.tenant_id == tenant_id
    )
    if app_public_id:
        q = q.filter(FinanceOpsRecord.app_public_id == app_public_id)
    rows = q.group_by(FinanceOpsRecord.kind, FinanceOpsRecord.status).all()
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
        "metrics_source": "finance_ops",
        "total": total_all,
        "open": total_open,
        "by_kind": by_kind,
        "cards": cards,
        "kyc_open": by_kind["finance_kyc"]["open"],
        "aml_open": by_kind["finance_aml"]["open"],
        "credit_open": by_kind["credit_approval"]["open"],
        "dd_open": by_kind["due_diligence"]["open"],
        "report_open": by_kind["regulatory_report"]["open"],
        "insurance_open": by_kind["insurance_case"]["open"],
    }
