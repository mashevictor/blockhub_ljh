"""CapShip · quality_inspect 质检记录。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import QualityInspectRecord, User

VALID_STATUS = frozenset({"open", "closed"})
VALID_RESULT = frozenset({"pass", "fail"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"QC-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: QualityInspectRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "product_code": row.product_code,
        "process_name": row.process_name,
        "result": row.result,
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
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query(QualityInspectRecord)
        .options(joinedload(QualityInspectRecord.reporter))
        .filter(QualityInspectRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(QualityInspectRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(QualityInspectRecord.status == status)
    return [to_dict(r) for r in q.order_by(QualityInspectRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    product_code: str,
    process_name: str,
    result: str,
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    res = (result or "pass").strip().lower()
    if res not in VALID_RESULT:
        res = "pass"
    row = QualityInspectRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        product_code=product_code.strip(),
        process_name=(process_name or "").strip() or "未填工序",
        result=res,
        note=(note or "").strip(),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event

        label = "合格" if res == "pass" else "不合格"
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title=f"质检录入 · {label}",
            content=(
                f"{row.record_no} · {row.product_code} · {row.process_name}\n"
                f"结果：{label}\n{(row.note or '')[:160]}"
            ),
            app_public_id=row.app_public_id,
            path="/quality-inspect",
            link_label="打开质检",
        )
    except Exception:
        pass
    return to_dict(row)


def close_record(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(QualityInspectRecord)
        .options(joinedload(QualityInspectRecord.reporter))
        .filter(QualityInspectRecord.tenant_id == tenant_id, QualityInspectRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "closed":
        return to_dict(row)
    row.status = "closed"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="质检已闭环",
            content=f"{row.record_no} · {row.product_code} · 已关闭",
            app_public_id=row.app_public_id,
            path="/quality-inspect",
            link_label="打开质检",
        )
    except Exception:
        pass
    return to_dict(row)
