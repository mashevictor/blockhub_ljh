"""CapShip · med_triage 医疗导诊。

科室建议：临床关键词规则引擎（热路径）+ 可选 DeepSeek 辅助（有 Key 时）；
仅供导诊分流参考，不构成诊疗建议。
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.db.models import MedTriageRecord, User

VALID_STATUS = frozenset({"open", "guided"})
VALID_URGENCY = frozenset({"low", "normal", "high"})

DISCLAIMER = "仅供导诊分流参考，不构成诊断或治疗建议；急危重症请立即急诊或拨打急救电话。"

# 临床关键词 → 建议科室（规则引擎；可被运营扩展）
_DEPT_HINTS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("胸闷", "心慌", "心悸", "血压", "胸痛", "放射性痛", "心肌"), "心内科"),
    (("咯血", "呼吸困难", "喘憋", "哮喘", "发烧", "发热", "咳嗽", "咽痛", "咳痰"), "呼吸内科 / 发热门诊"),
    (("腹痛", "腹泻", "恶心", "呕吐", "胃痛", "黑便", "黄疸", "反酸"), "消化内科"),
    (("皮疹", "过敏", "瘙痒", "荨麻疹", "湿疹"), "皮肤科"),
    (("牙痛", "牙龈", "智齿", "口腔溃疡"), "口腔科"),
    (("关节", "腰痛", "扭伤", "骨折", "肿胀", "骨痛"), "骨科"),
    (("头疼", "头痛", "头晕", "失眠", "肢体麻木", "抽搐", "卒中", "中风"), "神经内科"),
    (("孕", "产检", "月经", "阴道出血", "白带"), "妇产科"),
    (("孩子", "儿童", "小儿", "婴幼儿", "新生儿"), "儿科"),
    (("视力", "眼痛", "红眼", "飞蚊", "眼外伤"), "眼科"),
    (("耳鸣", "听力", "鼻塞", "咽喉", "扁桃体"), "耳鼻喉科"),
    (("尿频", "尿急", "血尿", "排尿困难", "肾结石"), "泌尿外科"),
    (("血糖", "糖尿病", "甲亢", "甲减", "甲状腺"), "内分泌科"),
    (("抑郁", "焦虑", "幻觉", "精神"), "精神心理科"),
    (("外伤", "切割伤", "车祸", "昏迷", "大出血"), "急诊科"),
    (("肿瘤", "化疗", "放疗", "癌"), "肿瘤科 / 肿瘤内科"),
    (("透析", "肌酐", "肾功能"), "肾内科"),
    (("贫血", "血小板", "白细胞", "凝血"), "血液科"),
)


def suggest_dept_rules(symptoms: str) -> tuple[str, list[str]]:
    """规则引擎匹配；返回 (科室, 命中关键词)。"""
    s = (symptoms or "").strip()
    hits: list[str] = []
    for words, dept in _DEPT_HINTS:
        matched = [w for w in words if w in s]
        if matched:
            hits.extend(matched)
            return dept, matched
    return "全科 / 导诊台", hits


def suggest_dept(symptoms: str) -> str:
    dept, _ = suggest_dept_rules(symptoms)
    return dept


def _ai_suggest_dept(symptoms: str, rule_dept: str) -> str | None:
    """可选 LLM 辅助科室建议；失败返回 None。"""
    if not (settings.deepseek_api_key or "").strip():
        return None
    try:
        from app.services.deepseek_client import deepseek_json_chat

        system = (
            "你是医院导诊辅助系统。根据患者主诉症状，建议最可能的一级科室。"
            "只输出 JSON：{\"suggested_dept\":\"科室名\",\"urgency\":\"low|normal|high\",\"rationale\":\"≤40字\"}。"
            "禁止给出诊断名或用药方案；若信息不足建议「全科 / 导诊台」。"
            "急危重红旗（大出血、意识障碍、严重胸痛伴冷汗等）urgency=high 且科室偏急诊科。"
        )
        user = f"症状主诉：{symptoms.strip()[:800]}\n规则引擎初判：{rule_dept}"
        data = deepseek_json_chat(system, user, temperature=0.1)
        if not data:
            return None
        dept = str(data.get("suggested_dept") or "").strip()
        return dept or None
    except Exception:
        return None


def suggest_dept_detail(symptoms: str, *, use_ai: bool = True) -> dict[str, Any]:
    """结构化科室建议（规则 + 可选 AI）。"""
    rule_dept, hits = suggest_dept_rules(symptoms)
    ai_dept = _ai_suggest_dept(symptoms, rule_dept) if use_ai else None
    final = (ai_dept or rule_dept).strip() or "全科 / 导诊台"
    source = "ai+rules" if ai_dept else "rules"
    return {
        "suggested_dept": final,
        "rule_dept": rule_dept,
        "matched_keywords": hits,
        "source": source,
        "ai_assisted": bool(ai_dept),
        "disclaimer": DISCLAIMER,
    }


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
