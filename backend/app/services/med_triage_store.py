"""CapShip · med_triage 医疗导诊。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import MedTriageRecord, User

VALID_STATUS = frozenset({"open", "guided"})
VALID_URGENCY = frozenset({"low", "normal", "high"})

# 确定性科室提示（热路径无 LLM；可被前端/运营覆盖）
_DEPT_HINTS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("胸闷", "心慌", "血压", "胸痛"), "心内科"),
    (("发烧", "咳嗽", "感冒", "咽痛"), "呼吸内科 / 发热门诊"),
    (("腹痛", "腹泻", "恶心", "胃痛"), "消化内科"),
    (("皮疹", "过敏", "瘙痒"), "皮肤科"),
    (("牙痛", "牙龈"), "口腔科"),
    (("关节", "腰痛", "扭伤", "骨折"), "骨科"),
    (("头疼", "头晕", "失眠"), "神经内科"),
    (("孕", "产检", "月经"), "妇产科"),
    (("孩子", "儿童", "小儿"), "儿科"),
)


def suggest_dept(symptoms: str) -> str:
    s = (symptoms or "").strip()
    for words, dept in _DEPT_HINTS:
        if any(w in s for w in words):
            return dept
    return "全科 / 导诊台"


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"MT-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: MedTriageRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "patient_name": row.patient_name,
        "symptoms": row.symptoms,
        "suggested_dept": row.suggested_dept,
        "urgency": row.urgency,
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
        db.query(MedTriageRecord)
        .options(joinedload(MedTriageRecord.reporter))
        .filter(MedTriageRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(MedTriageRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(MedTriageRecord.status == status)
    return [to_dict(r) for r in q.order_by(MedTriageRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    symptoms: str,
    patient_name: str = "",
    suggested_dept: str = "",
    urgency: str = "normal",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    urg = (urgency or "normal").strip().lower()
    if urg not in VALID_URGENCY:
        urg = "normal"
    dept = (suggested_dept or "").strip() or suggest_dept(symptoms)
    row = MedTriageRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        patient_name=(patient_name or "").strip() or "匿名患者",
        symptoms=(symptoms or "").strip(),
        suggested_dept=dept,
        urgency=urg,
        note=(note or "").strip(),
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
            title=f"导诊录入 · {row.suggested_dept}",
            content=(
                f"{row.record_no} · {row.patient_name}\n"
                f"症状：{(row.symptoms or '')[:120]}\n"
                f"建议科室：{row.suggested_dept} · 紧急度：{row.urgency}"
            ),
            app_public_id=row.app_public_id,
            path="/med-triage",
            link_label="打开导诊",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_guided(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(MedTriageRecord)
        .options(joinedload(MedTriageRecord.reporter))
        .filter(MedTriageRecord.tenant_id == tenant_id, MedTriageRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "guided":
        return to_dict(row)
    row.status = "guided"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="导诊已完成",
            content=f"{row.record_no} · {row.patient_name} → {row.suggested_dept}",
            app_public_id=row.app_public_id,
            path="/med-triage",
            link_label="打开导诊",
        )
    except Exception:
        pass
    return to_dict(row)
