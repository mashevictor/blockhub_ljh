"""CapShip · kill_pipeline 杀单工作台。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import KillPipelineRecord, SalesLeadRecord, User

VALID_STATUS = frozenset({"killed"})
VALID_REASON = frozenset(
    {"no_budget", "no_authority", "competitor", "timing", "product_fit", "fake_pipeline", "other"}
)


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"KP-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: KillPipelineRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "lead_id": row.lead_id,
        "customer": row.customer,
        "kill_reason": row.kill_reason,
        "learning": row.learning,
        "amount_lost": row.amount_lost,
        "competitor": row.competitor,
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
) -> list[dict[str, Any]]:
    q = (
        db.query(KillPipelineRecord)
        .options(joinedload(KillPipelineRecord.reporter))
        .filter(KillPipelineRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(KillPipelineRecord.app_public_id == app_public_id)
    return [to_dict(r) for r in q.order_by(KillPipelineRecord.created_at.desc()).limit(200).all()]


def reason_stats(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
) -> list[dict[str, Any]]:
    """按杀单原因聚合（空库 = 空列表）。"""
    q = db.query(KillPipelineRecord).filter(KillPipelineRecord.tenant_id == tenant_id)
    if app_public_id:
        q = q.filter(KillPipelineRecord.app_public_id == app_public_id)
    rows = q.all()
    if not rows:
        return []
    labels = {
        "no_budget": "无预算",
        "no_authority": "无决策权",
        "competitor": "竞品",
        "timing": "时机不对",
        "product_fit": "产品不适配",
        "fake_pipeline": "假管线",
        "other": "其他",
    }
    counts: dict[str, int] = {k: 0 for k in labels}
    for r in rows:
        key = (r.kill_reason or "other").strip()
        if key in counts:
            counts[key] += 1
        else:
            counts["other"] += 1
    return [{"name": labels[k], "value": counts[k], "reason": k} for k in labels if counts[k] > 0]


def create_record(
    db: Session,
    user: User,
    *,
    customer: str = "",
    kill_reason: str = "other",
    learning: str = "",
    amount_lost: str = "",
    competitor: str = "",
    lead_id: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    reason = (kill_reason or "other").strip().lower()
    if reason not in VALID_REASON:
        reason = "other"
    app_pid = (app_public_id or "").strip()
    cust = (customer or "").strip()
    lid = (lead_id or "").strip()
    if not lid and cust:
        q = db.query(SalesLeadRecord).filter(
            SalesLeadRecord.tenant_id == user.tenant_id,
            SalesLeadRecord.customer == cust,
            SalesLeadRecord.status.in_(("open", "following")),
        )
        if app_pid:
            q = q.filter(SalesLeadRecord.app_public_id == app_pid)
        lead = q.order_by(SalesLeadRecord.updated_at.desc()).first()
        if lead:
            lid = lead.id
    row = KillPipelineRecord(
        tenant_id=user.tenant_id,
        app_public_id=app_pid,
        reporter_id=user.id,
        record_no=_no(),
        lead_id=lid,
        customer=cust,
        kill_reason=reason,
        learning=(learning or "").strip(),
        amount_lost=(amount_lost or "").strip(),
        competitor=(competitor or "").strip(),
        status="killed",
    )
    db.add(row)
    if lid:
        lead = (
            db.query(SalesLeadRecord)
            .filter(SalesLeadRecord.tenant_id == user.tenant_id, SalesLeadRecord.id == lid)
            .first()
        )
        if lead and lead.status != "lost":
            lead.status = "lost"
    db.commit()
    db.refresh(row)
    row.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title="杀单工作台 · 已清理",
            content=f"{row.record_no} · {row.customer} · {row.kill_reason}",
            app_public_id=row.app_public_id,
            path="/kill-pipeline",
            link_label="打开杀单工作台",
        )
    except Exception:
        pass
    return to_dict(row)
