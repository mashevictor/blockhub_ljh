"""Approval workflow — PostgreSQL persistence."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import ApprovalRecord, User

DEMO_APPROVALS = [
    {
        "title": "请假申请",
        "approval_type": "leave",
        "department": "研发部",
        "summary": "年假 3 天（7/5-7/7）",
        "status": "pending",
        "applicant_email": "employee@trackchat.local",
    },
    {
        "title": "费用报销",
        "approval_type": "expense",
        "department": "市场部",
        "summary": "差旅费 ¥2,680",
        "status": "pending",
        "applicant_email": "employee@trackchat.local",
    },
    {
        "title": "用印申请",
        "approval_type": "seal",
        "department": "法务部",
        "summary": "合同盖章（客户A）",
        "status": "approved",
        "applicant_email": "employee@trackchat.local",
    },
]


def _format_dt(dt: datetime | None) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M")


def approval_to_dict(record: ApprovalRecord) -> dict[str, Any]:
    applicant_name = record.applicant.display_name if record.applicant else "未知"
    return {
        "id": record.id,
        "title": record.title,
        "applicant": applicant_name,
        "department": record.department,
        "status": record.status,
        "type": record.approval_type,
        "submitted_at": _format_dt(record.submitted_at),
        "summary": record.summary,
        "comment": record.comment,
        "payload": record.payload_json,
    }


def ensure_demo_approvals(db: Session, tenant_id: str) -> None:
    if db.query(ApprovalRecord).filter(ApprovalRecord.tenant_id == tenant_id).first():
        return
    for item in DEMO_APPROVALS:
        user = db.query(User).filter(User.email == item["applicant_email"]).first()
        if not user:
            continue
        db.add(
            ApprovalRecord(
                tenant_id=tenant_id,
                applicant_id=user.id,
                title=item["title"],
                approval_type=item["approval_type"],
                department=item["department"],
                summary=item["summary"],
                status=item["status"],
                payload_json={},
            )
        )
    db.commit()


def approval_stats(db: Session, tenant_id: str) -> dict[str, int]:
    rows = db.query(ApprovalRecord).filter(ApprovalRecord.tenant_id == tenant_id).all()
    return {
        "pending": sum(1 for r in rows if r.status == "pending"),
        "approved": sum(1 for r in rows if r.status == "approved"),
        "rejected": sum(1 for r in rows if r.status == "rejected"),
        "total": len(rows),
    }


def list_approvals(
    db: Session,
    tenant_id: str,
    *,
    status: str | None = None,
    user: User | None = None,
) -> list[dict[str, Any]]:
    query = db.query(ApprovalRecord).filter(ApprovalRecord.tenant_id == tenant_id)
    if user and user.role == "employee":
        query = query.filter(ApprovalRecord.applicant_id == user.id)
    if status and status != "all":
        query = query.filter(ApprovalRecord.status == status)
    rows = query.order_by(ApprovalRecord.submitted_at.desc()).all()
    return [approval_to_dict(r) for r in rows]


def get_approval(db: Session, tenant_id: str, approval_id: str) -> ApprovalRecord | None:
    return (
        db.query(ApprovalRecord)
        .filter(ApprovalRecord.tenant_id == tenant_id, ApprovalRecord.id == approval_id)
        .first()
    )


def submit_approval(
    db: Session,
    user: User,
    *,
    title: str,
    approval_type: str,
    department: str,
    summary: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    record = ApprovalRecord(
        tenant_id=user.tenant_id,
        applicant_id=user.id,
        title=title.strip(),
        approval_type=approval_type or "general",
        department=department.strip() or "未填写",
        summary=summary.strip(),
        status="pending",
        payload_json=payload or {},
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return approval_to_dict(record)


def action_approval(
    db: Session,
    tenant_id: str,
    approval_id: str,
    *,
    action: str,
    comment: str,
    approver: User,
) -> dict[str, Any] | None:
    record = get_approval(db, tenant_id, approval_id)
    if not record:
        return None
    if record.status != "pending":
        return approval_to_dict(record)
    if action == "approve":
        record.status = "approved"
    elif action == "reject":
        record.status = "rejected"
    else:
        return approval_to_dict(record)
    record.comment = comment
    record.approver_id = approver.id
    record.decided_at = datetime.now(timezone.utc)
    db.add(record)
    db.commit()
    db.refresh(record)
    return approval_to_dict(record)
