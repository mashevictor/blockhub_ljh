"""CapShip · homework_qa 作业答疑。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import HomeworkQaRecord, User

VALID_STATUS = frozenset({"open", "reviewed"})
VALID_CATEGORY = frozenset({"homework", "qa", "wrongbook"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"HW-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: HomeworkQaRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "student_name": row.student_name,
        "subject": row.subject,
        "category": row.category,
        "title": row.title,
        "content": row.content,
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
        db.query(HomeworkQaRecord)
        .options(joinedload(HomeworkQaRecord.reporter))
        .filter(HomeworkQaRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(HomeworkQaRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(HomeworkQaRecord.status == status)
    return [to_dict(r) for r in q.order_by(HomeworkQaRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    title: str,
    content: str = "",
    student_name: str = "",
    subject: str = "",
    category: str = "homework",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "homework").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "homework"
    row = HomeworkQaRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        student_name=(student_name or "").strip() or (user.display_name or "学生"),
        subject=(subject or "").strip() or "未填科目",
        category=cat,
        title=(title or "").strip() or "未填标题",
        content=(content or "").strip(),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event

        kind = {"homework": "作业", "qa": "答疑", "wrongbook": "错题"}.get(cat, "作业")
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title=f"{kind}提交 · 待批改",
            content=(
                f"{row.record_no} · {row.student_name} · {row.subject}\n"
                f"{row.title}\n{(row.content or '')[:160]}"
            ),
            app_public_id=row.app_public_id,
            path="/homework-qa",
            link_label="打开作业答疑",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_reviewed(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(HomeworkQaRecord)
        .options(joinedload(HomeworkQaRecord.reporter))
        .filter(HomeworkQaRecord.tenant_id == tenant_id, HomeworkQaRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "reviewed":
        return to_dict(row)
    row.status = "reviewed"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="作业答疑 · 已批改",
            content=f"{row.record_no} · {row.student_name} · {row.title} · 已完成",
            app_public_id=row.app_public_id,
            path="/homework-qa",
            link_label="打开作业答疑",
        )
    except Exception:
        pass
    return to_dict(row)
