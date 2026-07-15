"""CapShip · policy_qa 制度问答。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import PolicyQaRecord, User
from app.services.deepseek_client import deepseek_json_chat

VALID_STATUS = frozenset(('open', 'answered', 'archived'))
VALID_CATEGORY = frozenset(('ask', 'policy', 'benefit'))


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"PQ-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: PolicyQaRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "title": row.title,
        "dept": row.dept,
        "answer": row.answer,
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
        db.query(PolicyQaRecord)
        .options(joinedload(PolicyQaRecord.reporter))
        .filter(PolicyQaRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(PolicyQaRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(PolicyQaRecord.status == status)
    return [to_dict(r) for r in q.order_by(PolicyQaRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    title: str = "",
    dept: str = "",
    answer: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "ask").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "ask"
    row = PolicyQaRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        title=(title or "").strip(),
        dept=(dept or "").strip(),
        answer=(answer or "").strip(),
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
            title="制度问答 · 新记录",
            content=f"{row.record_no} · {getattr(row, 'title', '')}",
            app_public_id=row.app_public_id,
            path="/policy-qa",
            link_label="打开制度问答",
        )
    except Exception:
        pass
    return to_dict(row)


def answer_question(
    db: Session,
    user: User,
    *,
    query: str,
    app_public_id: str = "",
) -> dict[str, Any]:
    """用户一问 → DeepSeek 答复 → 落库为 answered 记录。无模型时明确失败信息不假装已答。"""
    q = (query or "").strip()
    if not q:
        return {"ok": False, "error": "请先输入制度或福利问题", "record": None}

    system = (
        "你是中国企业 HR/行政制度助手。根据用户问题，给出简明、可执行的制度答复摘要。"
        "不要编造具体法律条文编号；不确定时降低 confidence 并在 note 说明需 HR 确认。"
        "只返回 JSON：{\"category\":\"ask|policy|benefit\",\"title\":\"制度或主题名\","
        "\"dept\":\"建议咨询部门\",\"summary\":\"答复摘要\",\"confidence\":0.0,\"note\":\"\"}"
    )
    user_msg = f"用户问题：{q}\n请给出制度/福利答复。"
    parsed = deepseek_json_chat(system, user_msg, temperature=0.2)
    if not isinstance(parsed, dict):
        return {
            "ok": False,
            "error": "暂时无法自动答复（未配置模型或模型无响应），请稍后重试或联系 HR",
            "record": None,
        }

    cat = str(parsed.get("category") or "ask").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "ask"
    title = str(parsed.get("title") or q).strip()[:200] or q[:200]
    dept = str(parsed.get("dept") or "").strip()[:120]
    summary = str(parsed.get("summary") or "").strip()[:500]
    note = str(parsed.get("note") or "").strip()[:200]
    try:
        conf = float(parsed.get("confidence") if parsed.get("confidence") is not None else 0.5)
    except (TypeError, ValueError):
        conf = 0.5
    conf = max(0.0, min(conf, 1.0))
    if not summary:
        return {
            "ok": False,
            "error": "模型未给出有效答复，请换个问法或联系 HR",
            "record": None,
        }

    row = PolicyQaRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        title=title,
        dept=dept,
        answer=summary,
        note=(f"置信度 {int(conf * 100)}%" + (f" · {note}" if note else ""))[:500],
        status="answered",
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
            title="制度问答 · 已自动答复",
            content=f"{row.record_no} · {row.title}\n{row.answer[:120]}",
            app_public_id=row.app_public_id,
            path="/policy-qa",
            link_label="打开制度问答",
        )
    except Exception:
        pass
    out = to_dict(row)
    out["confidence"] = conf
    return {"ok": True, "error": "", "record": out}


def mark_answered(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(PolicyQaRecord)
        .options(joinedload(PolicyQaRecord.reporter))
        .filter(PolicyQaRecord.tenant_id == tenant_id, PolicyQaRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "answered":
        return to_dict(row)
    row.status = "answered"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="制度问答 · 已答复",
            content=f"{row.record_no} · 状态已更新为 已答复",
            app_public_id=row.app_public_id, path="/policy-qa", link_label="打开制度问答",
        )
    except Exception:
        pass
    return to_dict(row)

def mark_archived(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(PolicyQaRecord)
        .options(joinedload(PolicyQaRecord.reporter))
        .filter(PolicyQaRecord.tenant_id == tenant_id, PolicyQaRecord.id == record_id)
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
            db, tenant_id=tenant_id, title="制度问答 · 归档",
            content=f"{row.record_no} · 状态已更新为 归档",
            app_public_id=row.app_public_id, path="/policy-qa", link_label="打开制度问答",
        )
    except Exception:
        pass
    return to_dict(row)

