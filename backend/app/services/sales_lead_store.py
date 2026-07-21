"""CapShip · sales_lead 销售线索（获客方法 + 漏斗）。"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.db.models import SalesLeadRecord, User

VALID_STATUS = frozenset(("open", "following", "won", "lost"))
VALID_POOL = frozenset(("private", "pool", "invalid", "duplicate"))
VALID_ROLES = frozenset(("sales_rep", "sales_manager", "sales_marketing"))
# 获客 method（写入 category）
ACQ_METHODS = frozenset(
    (
        "lead-capture",
        "lead-assignment",
        "lead-cleaning",
        "lead-pool",
        "lead-scoring",
        "referral-lead",
        "channel-analysis",
        "lead",
        "opportunity",
        "account",
    )
)


class EvidenceGateError(Exception):
    """线索晋级缺少成交证据。"""

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class AcqError(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


def _norm_category(raw: str, default: str = "lead-capture") -> str:
    cat = (raw or "").strip().lower()[:64]
    if cat in ACQ_METHODS:
        return cat
    return cat if cat else default


def _norm_pool(raw: str, default: str = "private") -> str:
    p = (raw or "").strip().lower()
    return p if p in VALID_POOL else default


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"SL-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def _get(db: Session, tenant_id: str, record_id: str) -> SalesLeadRecord | None:
    return (
        db.query(SalesLeadRecord)
        .options(joinedload(SalesLeadRecord.reporter))
        .filter(SalesLeadRecord.tenant_id == tenant_id, SalesLeadRecord.id == record_id)
        .first()
    )


def to_dict(row: SalesLeadRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "customer": row.customer,
        "amount": row.amount,
        "owner": row.owner,
        "note": row.note,
        "status": row.status,
        "source": getattr(row, "source", "") or "",
        "score": getattr(row, "score", None),
        "pool_status": getattr(row, "pool_status", None) or "private",
        "owner_user_id": getattr(row, "owner_user_id", None) or "",
        "assignee_user_id": getattr(row, "assignee_user_id", None) or "",
        "referrer": getattr(row, "referrer", "") or "",
        "reporter_id": row.reporter_id,
        "reporter_name": name,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "updated_at": row.updated_at.isoformat() if row.updated_at else "",
    }


def list_records(
    db: Session,
    tenant_id: str,
    *,
    user: User | None = None,
    app_public_id: str | None = None,
    status: str | None = None,
    category: str | None = None,
    pool_status: str | None = None,
    mine: bool = False,
    role: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query(SalesLeadRecord)
        .options(joinedload(SalesLeadRecord.reporter))
        .filter(SalesLeadRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(SalesLeadRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(SalesLeadRecord.status == status)
    if category:
        q = q.filter(SalesLeadRecord.category == _norm_category(category))
    if pool_status and pool_status in VALID_POOL:
        q = q.filter(SalesLeadRecord.pool_status == pool_status)

    role_key = (role or "").strip().lower()
    if role_key in VALID_ROLES and user is not None:
        display = (user.display_name or "").strip()
        if role_key == "sales_rep":
            # 一线：我的线索 + 公海可领
            q = q.filter(
                or_(
                    SalesLeadRecord.owner_user_id == user.id,
                    SalesLeadRecord.owner == display,
                    SalesLeadRecord.pool_status == "pool",
                )
            )
            q = q.filter(SalesLeadRecord.pool_status.in_(("private", "pool")))
        elif role_key == "sales_manager":
            # 主管：待分配（无私有负责人或公海）+ 清洗/评分相关 open
            q = q.filter(SalesLeadRecord.status.in_(("open", "following")))
        elif role_key == "sales_marketing":
            # 市场：全部线索（看渠道）
            pass

    if mine and user is not None:
        display = (user.display_name or "").strip()
        q = q.filter(
            or_(
                SalesLeadRecord.owner_user_id == user.id,
                SalesLeadRecord.owner == display,
            )
        )

    return [to_dict(r) for r in q.order_by(SalesLeadRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    category: str = "",
    customer: str = "",
    amount: str = "",
    owner: str = "",
    note: str = "",
    source: str = "",
    referrer: str = "",
    pool_status: str = "private",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = _norm_category(category, "lead-capture")
    if cat == "referral-lead" and not (referrer or "").strip():
        raise AcqError("转介绍线索必须填写推荐人")
    # 获客录入/转介绍默认进「待领取」；只有显式 private 或已指定负责人时才进私海
    acq_cats = ("lead-capture", "referral-lead", "lead", "channel-analysis")
    default_pool = "pool" if cat in acq_cats else "private"
    desired_pool = _norm_pool(pool_status, default_pool)
    src = (source or "").strip()[:64]
    if cat == "referral-lead" and not src:
        src = "转介绍"
    cust = (customer or "").strip()
    note_s = (note or "").strip()
    app_pid = (app_public_id or "").strip()

    # 防双提交：同一租户/应用/客户/来源 90 秒内复用已有记录（忽略备注细微差异）
    if cust and cat in ("lead-capture", "referral-lead", "lead"):
        since = datetime.now(timezone.utc) - timedelta(seconds=90)
        dup_q = (
            db.query(SalesLeadRecord)
            .options(joinedload(SalesLeadRecord.reporter))
            .filter(
                SalesLeadRecord.tenant_id == user.tenant_id,
                SalesLeadRecord.app_public_id == app_pid,
                SalesLeadRecord.customer == cust,
                SalesLeadRecord.source == src,
                SalesLeadRecord.category == cat,
                SalesLeadRecord.reporter_id == user.id,
                SalesLeadRecord.created_at >= since,
            )
            .order_by(SalesLeadRecord.created_at.desc())
        )
        existing = dup_q.first()
        if existing:
            return to_dict(existing)

    display = (user.display_name or user.email or "").strip()
    if desired_pool == "pool":
        owner_name = (owner or "").strip() or "待领取"
        owner_uid = None
    else:
        owner_name = (owner or "").strip() or display
        owner_uid = user.id if not (owner or "").strip() or owner_name == display else None
    row = SalesLeadRecord(
        tenant_id=user.tenant_id,
        app_public_id=app_pid,
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        customer=cust,
        amount=(amount or "").strip(),
        owner=owner_name,
        note=note_s,
        status="open",
        source=src,
        score=None,
        pool_status=desired_pool,
        owner_user_id=owner_uid,
        assignee_user_id=None,
        referrer=(referrer or "").strip()[:200],
    )
    # 显式指定其他负责人 = 直接私海认领（分配场景）
    if desired_pool != "pool" and owner and owner_name != display:
        row.owner_user_id = None
        row.pool_status = "private"
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    # 先序列化：后续站内信失败若 rollback，ORM 行会过期导致 to_dict 500
    out = to_dict(row)
    if desired_pool == "pool":
        try:
            from app.services.notification_service import create_notification

            peers = (
                db.query(User)
                .filter(User.tenant_id == user.tenant_id, User.role.in_(("employee", "admin")))
                .all()
            )
            # reference_id 列最长 64；不可拼两个 UUID
            ref = f"pool:{row.id}"[:64]
            for peer in peers:
                try:
                    create_notification(
                        db,
                        tenant_id=user.tenant_id,
                        title=f"新待领取线索 · {out.get('customer') or ''}",
                        content=f"{out.get('record_no') or ''} · 来源 {out.get('source') or '未标注'} · 打开「待领取」认领",
                        type="sales_lead",
                        recipient_user_id=peer.id,
                        reference_id=ref,
                    )
                except Exception:
                    try:
                        db.rollback()
                    except Exception:
                        pass
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title="销售线索 · 新记录",
            content=f"{out.get('record_no') or ''} · {out.get('customer') or ''}",
            app_public_id=out.get("app_public_id") or "",
            path="/sales-lead",
            link_label="打开销售线索",
        )
    except Exception:
        pass
    return out


def _find_user(
    db: Session,
    tenant_id: str,
    *,
    user_id: str = "",
    name: str = "",
) -> User | None:
    uid = (user_id or "").strip()
    if uid:
        u = db.query(User).filter(User.tenant_id == tenant_id, User.id == uid).first()
        if u:
            return u
    n = (name or "").strip()
    if not n:
        return None
    return (
        db.query(User)
        .filter(User.tenant_id == tenant_id)
        .filter(or_(User.display_name == n, User.email == n))
        .first()
    )


def _notify_lead(
    db: Session,
    *,
    tenant_id: str,
    title: str,
    content: str,
    recipient_user_id: str | None = None,
    reference_id: str | None = None,
    app_public_id: str = "",
) -> None:
    ref = (reference_id or "")[:64] or None
    try:
        from app.services.notification_service import create_notification, notify_tenant_admins

        if recipient_user_id:
            create_notification(
                db,
                tenant_id=tenant_id,
                title=title,
                content=content,
                type="sales_lead",
                recipient_user_id=recipient_user_id,
                reference_id=ref,
            )
        else:
            notify_tenant_admins(
                db,
                tenant_id=tenant_id,
                title=title,
                content=content,
                type="sales_lead",
                reference_id=ref,
            )
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title=title,
            content=content,
            app_public_id=app_public_id or None,
            path="/sales-lead",
            link_label="打开销售线索",
        )
    except Exception:
        pass


def assign_record(
    db: Session,
    tenant_id: str,
    record_id: str,
    *,
    assignee: str,
    assignee_user_id: str = "",
    note: str = "",
) -> dict[str, Any] | None:
    row = _get(db, tenant_id, record_id)
    if not row:
        return None
    name = (assignee or "").strip()
    if not name:
        raise AcqError("请指定负责人")
    target = _find_user(db, tenant_id, user_id=assignee_user_id, name=name)
    row.owner = name
    row.assignee_user_id = (target.id if target else None) or ((assignee_user_id or "").strip() or None)
    row.owner_user_id = row.assignee_user_id
    row.pool_status = "private"
    row.category = "lead-assignment"
    if note.strip():
        row.note = f"{row.note}\n[分配] {note.strip()}".strip() if row.note else f"[分配] {note.strip()}"
    db.commit()
    db.refresh(row)
    _notify_lead(
        db,
        tenant_id=tenant_id,
        title=f"线索已分配给你 · {row.customer}",
        content=f"{row.record_no} · 请到「跟进成交」继续推进",
        recipient_user_id=row.owner_user_id,
        reference_id=f"assign:{row.id}",
        app_public_id=row.app_public_id or "",
    )
    return to_dict(row)


def clean_record(
    db: Session,
    tenant_id: str,
    record_id: str,
    *,
    result: str,
    reason: str = "",
) -> dict[str, Any] | None:
    row = _get(db, tenant_id, record_id)
    if not row:
        return None
    r = (result or "").strip().lower()
    mapping = {
        "有效": "private",
        "valid": "private",
        "无效": "invalid",
        "invalid": "invalid",
        "重复": "duplicate",
        "duplicate": "duplicate",
        "公海": "pool",
        "待领取": "pool",
        "pool": "pool",
    }
    pool = mapping.get(r)
    if not pool:
        raise AcqError("清洗结果须为：有效/无效/重复/待领取")
    row.pool_status = pool
    row.category = "lead-cleaning"
    if pool in ("invalid", "duplicate"):
        row.status = "lost"
    if reason.strip():
        row.note = f"{row.note}\n[清洗] {reason.strip()}".strip() if row.note else f"[清洗] {reason.strip()}"
    db.commit()
    db.refresh(row)
    return to_dict(row)


def claim_record(
    db: Session,
    user: User,
    record_id: str,
    *,
    reason: str = "",
) -> dict[str, Any] | None:
    row = _get(db, user.tenant_id, record_id)
    if not row:
        return None
    if (row.pool_status or "") != "pool":
        raise AcqError("仅「待领取」线索可领取")
    row.owner = user.display_name or user.email or ""
    row.owner_user_id = user.id
    row.assignee_user_id = user.id
    row.pool_status = "private"
    row.category = "lead-pool"
    if reason.strip():
        row.note = f"{row.note}\n[领取] {reason.strip()}".strip() if row.note else f"[领取] {reason.strip()}"
    db.commit()
    db.refresh(row)
    _notify_lead(
        db,
        tenant_id=user.tenant_id,
        title=f"你已领取线索 · {row.customer}",
        content=f"{row.record_no} · 下一步：打开「跟进成交」点 →跟进中",
        recipient_user_id=user.id,
        reference_id=f"claim:{row.id}",
        app_public_id=row.app_public_id or "",
    )
    return to_dict(row)


def release_record(
    db: Session,
    tenant_id: str,
    record_id: str,
    *,
    reason: str = "",
) -> dict[str, Any] | None:
    row = _get(db, tenant_id, record_id)
    if not row:
        return None
    if row.status in ("won", "lost"):
        raise AcqError("已成交/丢单线索不可退回待领取")
    row.pool_status = "pool"
    row.owner = ""
    row.owner_user_id = None
    row.assignee_user_id = None
    row.category = "lead-pool"
    if reason.strip():
        row.note = f"{row.note}\n[退回待领取] {reason.strip()}".strip() if row.note else f"[退回待领取] {reason.strip()}"
    db.commit()
    db.refresh(row)
    return to_dict(row)


def score_record(
    db: Session,
    tenant_id: str,
    record_id: str,
    *,
    score: int,
    comment: str = "",
) -> dict[str, Any] | None:
    row = _get(db, tenant_id, record_id)
    if not row:
        return None
    if score < 1 or score > 100:
        raise AcqError("评分须在 1–100")
    row.score = score
    row.category = "lead-scoring"
    if comment.strip():
        row.note = f"{row.note}\n[评分] {comment.strip()}".strip() if row.note else f"[评分] {comment.strip()}"
    db.commit()
    db.refresh(row)
    return to_dict(row)


def resolve_lead_id(db: Session, tenant_id: str, raw: str, *, app_public_id: str | None = None) -> str | None:
    """支持完整 id / record_no / 客户名模糊。"""
    key = (raw or "").strip()
    if not key:
        return None
    q = db.query(SalesLeadRecord).filter(SalesLeadRecord.tenant_id == tenant_id)
    if app_public_id:
        q = q.filter(SalesLeadRecord.app_public_id == app_public_id)
    by_id = q.filter(SalesLeadRecord.id == key).first()
    if by_id:
        return by_id.id
    by_no = q.filter(SalesLeadRecord.record_no == key).first()
    if by_no:
        return by_no.id
    by_name = (
        q.filter(SalesLeadRecord.customer.ilike(f"%{key}%"))
        .order_by(SalesLeadRecord.created_at.desc())
        .first()
    )
    return by_name.id if by_name else None


def channel_stats(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
) -> list[dict[str, Any]]:
    q = db.query(SalesLeadRecord).filter(SalesLeadRecord.tenant_id == tenant_id)
    if app_public_id:
        q = q.filter(SalesLeadRecord.app_public_id == app_public_id)
    rows = q.all()
    if not rows:
        return []
    buckets: dict[str, dict[str, int]] = {}
    for r in rows:
        src = (getattr(r, "source", None) or "").strip() or "未标注"
        b = buckets.setdefault(src, {"total": 0, "won": 0, "following": 0, "open": 0, "lost": 0})
        b["total"] += 1
        st = (r.status or "open").strip()
        if st in b:
            b[st] += 1
    out = []
    for src, b in sorted(buckets.items(), key=lambda x: -x[1]["total"]):
        total = b["total"]
        won = b["won"]
        out.append(
            {
                "source": src,
                "total": total,
                "open": b["open"],
                "following": b["following"],
                "won": won,
                "lost": b["lost"],
                "win_rate": round(won / total, 3) if total else 0,
            }
        )
    return out


def funnel_stats(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
) -> list[dict[str, Any]]:
    q = db.query(SalesLeadRecord).filter(SalesLeadRecord.tenant_id == tenant_id)
    if app_public_id:
        q = q.filter(SalesLeadRecord.app_public_id == app_public_id)
    rows = q.all()
    if not rows:
        return []
    labels = {
        "open": "新线索",
        "following": "跟进中",
        "won": "成交",
        "lost": "丢单",
    }
    counts = {k: 0 for k in labels}
    for r in rows:
        st = (r.status or "").strip()
        if st in counts:
            counts[st] += 1
    return [{"name": labels[k], "value": counts[k]} for k in ("open", "following", "won", "lost")]


def stale_opportunities(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
    days: int = 7,
) -> list[dict[str, Any]]:
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(days=max(1, min(days, 90)))
    q = (
        db.query(SalesLeadRecord)
        .options(joinedload(SalesLeadRecord.reporter))
        .filter(
            SalesLeadRecord.tenant_id == tenant_id,
            SalesLeadRecord.status.in_(("open", "following")),
            SalesLeadRecord.updated_at < cutoff,
        )
    )
    if app_public_id:
        q = q.filter(SalesLeadRecord.app_public_id == app_public_id)
    return [to_dict(r) for r in q.order_by(SalesLeadRecord.updated_at.asc()).limit(100).all()]


def mark_following(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = _get(db, tenant_id, record_id)
    if not row:
        return None
    if row.status == "following":
        return to_dict(row)
    from app.services.deal_evidence_store import has_gate_evidence

    if not has_gate_evidence(
        db, tenant_id, lead_id=row.id, target="following", customer=row.customer, app_public_id=row.app_public_id
    ):
        raise EvidenceGateError("晋级「跟进中」需先在成交证据登记会议纪要或买方回执（可关联本线索客户名）")
    row.status = "following"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="销售线索 · 跟进中",
            content=f"{row.record_no} · 状态已更新为 跟进中",
            app_public_id=row.app_public_id,
            path="/sales-lead",
            link_label="打开销售线索",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_won(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = _get(db, tenant_id, record_id)
    if not row:
        return None
    if row.status == "won":
        return to_dict(row)
    from app.services.deal_evidence_store import has_gate_evidence

    if not has_gate_evidence(
        db, tenant_id, lead_id=row.id, target="won", customer=row.customer, app_public_id=row.app_public_id
    ):
        raise EvidenceGateError("晋级「成交」需先登记 POC 结果、签约意向或回款证明类成交证据")
    row.status = "won"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="销售线索 · 成交",
            content=f"{row.record_no} · 状态已更新为 成交",
            app_public_id=row.app_public_id,
            path="/sales-lead",
            link_label="打开销售线索",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_lost(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = _get(db, tenant_id, record_id)
    if not row:
        return None
    if row.status == "lost":
        return to_dict(row)
    row.status = "lost"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="销售线索 · 丢单",
            content=f"{row.record_no} · 状态已更新为 丢单",
            app_public_id=row.app_public_id,
            path="/sales-lead",
            link_label="打开销售线索",
        )
    except Exception:
        pass
    return to_dict(row)
