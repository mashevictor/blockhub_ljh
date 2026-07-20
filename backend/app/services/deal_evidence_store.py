"""CapShip · deal_evidence 成交证据。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import DealEvidenceRecord, SalesLeadRecord, User

VALID_STATUS = frozenset({"open", "verified"})
VALID_EVIDENCE = frozenset(
    {"meeting_notes", "buyer_reply", "poc_result", "signed_intent", "payment_proof", "other"}
)
VALID_TARGET = frozenset({"following", "won"})
FOLLOWING_TYPES = frozenset({"meeting_notes", "buyer_reply", "other"})
WON_TYPES = frozenset({"poc_result", "signed_intent", "payment_proof"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"DE-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: DealEvidenceRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "lead_id": row.lead_id,
        "customer": row.customer,
        "evidence_type": row.evidence_type,
        "title": row.title,
        "summary": row.summary,
        "target_stage": row.target_stage,
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
    lead_id: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query(DealEvidenceRecord)
        .options(joinedload(DealEvidenceRecord.reporter))
        .filter(DealEvidenceRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(DealEvidenceRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(DealEvidenceRecord.status == status)
    if lead_id:
        q = q.filter(DealEvidenceRecord.lead_id == lead_id)
    return [to_dict(r) for r in q.order_by(DealEvidenceRecord.created_at.desc()).limit(200).all()]


def _resolve_lead_id(
    db: Session,
    tenant_id: str,
    *,
    lead_id: str,
    customer: str,
    app_public_id: str,
) -> str:
    lid = (lead_id or "").strip()
    if lid:
        row = (
            db.query(SalesLeadRecord)
            .filter(SalesLeadRecord.tenant_id == tenant_id, SalesLeadRecord.id == lid)
            .first()
        )
        return row.id if row else ""
    cust = (customer or "").strip()
    if not cust:
        return ""
    q = db.query(SalesLeadRecord).filter(
        SalesLeadRecord.tenant_id == tenant_id,
        SalesLeadRecord.customer == cust,
        SalesLeadRecord.status.in_(("open", "following")),
    )
    if app_public_id:
        q = q.filter(SalesLeadRecord.app_public_id == app_public_id)
    row = q.order_by(SalesLeadRecord.updated_at.desc()).first()
    return row.id if row else ""


def create_record(
    db: Session,
    user: User,
    *,
    customer: str = "",
    evidence_type: str = "other",
    title: str = "",
    summary: str = "",
    target_stage: str = "following",
    lead_id: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    et = (evidence_type or "other").strip().lower()
    if et not in VALID_EVIDENCE:
        et = "other"
    stage = (target_stage or "following").strip().lower()
    if stage not in VALID_TARGET:
        stage = "following"
    app_pid = (app_public_id or "").strip()
    cust = (customer or "").strip()
    resolved = _resolve_lead_id(db, user.tenant_id, lead_id=lead_id, customer=cust, app_public_id=app_pid)
    row = DealEvidenceRecord(
        tenant_id=user.tenant_id,
        app_public_id=app_pid,
        reporter_id=user.id,
        record_no=_no(),
        lead_id=resolved,
        customer=cust,
        evidence_type=et,
        title=(title or "").strip() or et,
        summary=(summary or "").strip(),
        target_stage=stage,
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
            title="成交证据 · 已登记",
            content=f"{row.record_no} · {row.customer} · {row.evidence_type}",
            app_public_id=row.app_public_id,
            path="/deal-evidence",
            link_label="打开成交证据",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_verified(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(DealEvidenceRecord)
        .options(joinedload(DealEvidenceRecord.reporter))
        .filter(DealEvidenceRecord.tenant_id == tenant_id, DealEvidenceRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    row.status = "verified"
    db.commit()
    db.refresh(row)
    return to_dict(row)


def has_gate_evidence(
    db: Session,
    tenant_id: str,
    *,
    lead_id: str,
    target: str,
    customer: str = "",
    app_public_id: str = "",
) -> bool:
    """晋级门禁：跟进需会议/买方回执；成交需 POC/意向/回款证明。"""
    types = FOLLOWING_TYPES if target == "following" else WON_TYPES
    q = db.query(DealEvidenceRecord).filter(
        DealEvidenceRecord.tenant_id == tenant_id,
        DealEvidenceRecord.evidence_type.in_(tuple(types)),
    )
    if app_public_id:
        q = q.filter(DealEvidenceRecord.app_public_id == app_public_id)
    if lead_id and q.filter(DealEvidenceRecord.lead_id == lead_id).count() > 0:
        return True
    cust = (customer or "").strip()
    if cust and q.filter(DealEvidenceRecord.customer == cust).count() > 0:
        return True
    return False
