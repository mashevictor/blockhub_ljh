"""CapShip · class_schedule 课表查询。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import ClassScheduleRecord, User

VALID_STATUS = frozenset({"published", "archived"})
VALID_CATEGORY = frozenset({"course", "exam", "classroom"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"CS-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: ClassScheduleRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "title": row.title,
        "schedule_date": row.schedule_date,
        "time_slot": row.time_slot,
        "location": row.location,
        "category": row.category,
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
        db.query(ClassScheduleRecord)
        .options(joinedload(ClassScheduleRecord.reporter))
        .filter(ClassScheduleRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(ClassScheduleRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(ClassScheduleRecord.status == status)
    return [to_dict(r) for r in q.order_by(ClassScheduleRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    title: str,
    schedule_date: str = "",
    time_slot: str = "",
    location: str = "",
    category: str = "course",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "course").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "course"
    row = ClassScheduleRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        title=(title or "").strip() or "未填标题",
        schedule_date=(schedule_date or "").strip(),
        time_slot=(time_slot or "").strip() or "未填时段",
        location=(location or "").strip() or "未填教室",
        category=cat,
        status="published",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event

        kind = {"course": "课程", "exam": "考试", "classroom": "教室"}.get(cat, "课程")
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title=f"课表查询 · {kind}已发布",
            content=(
                f"{row.record_no} · {row.schedule_date} {row.time_slot}\n"
                f"{row.title} · {row.location}"
            ),
            app_public_id=row.app_public_id,
            path="/class-schedule",
            link_label="打开课表查询",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_archived(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(ClassScheduleRecord)
        .options(joinedload(ClassScheduleRecord.reporter))
        .filter(ClassScheduleRecord.tenant_id == tenant_id, ClassScheduleRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "archived":
        return to_dict(row)
    row.status = "archived"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="课表查询 · 已归档",
            content=f"{row.record_no} · {row.title} · {row.schedule_date} · 已归档",
            app_public_id=row.app_public_id,
            path="/class-schedule",
            link_label="打开课表查询",
        )
    except Exception:
        pass
    return to_dict(row)
