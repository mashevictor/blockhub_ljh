"""CapShip · member_loyalty 会员营销 MVP：档案 / 活动 / 流水 / 触达。"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import (
    MemberLoyaltyCampaign,
    MemberLoyaltyMember,
    MemberLoyaltyOutreach,
    MemberLoyaltyPointTxn,
    User,
)

SLEEPING_DAYS = 30


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _refresh_member_status(m: MemberLoyaltyMember) -> None:
    last = m.last_visit_at
    if last is None:
        m.status = "sleeping"
        return
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    m.status = "sleeping" if (_now() - last) > timedelta(days=SLEEPING_DAYS) else "active"


def member_dict(m: MemberLoyaltyMember) -> dict[str, Any]:
    _refresh_member_status(m)
    return {
        "id": m.id,
        "name": m.name,
        "phone": m.phone,
        "points": int(m.points or 0),
        "status": m.status,
        "last_visit_at": m.last_visit_at.isoformat() if m.last_visit_at else "",
        "app_public_id": m.app_public_id,
        "created_at": m.created_at.isoformat() if m.created_at else "",
    }


def campaign_dict(c: MemberLoyaltyCampaign) -> dict[str, Any]:
    return {
        "id": c.id,
        "name": c.name,
        "campaign_type": c.campaign_type,
        "rule_text": c.rule_text,
        "points_delta": int(c.points_delta or 0),
        "status": c.status,
        "created_at": c.created_at.isoformat() if c.created_at else "",
    }


def txn_dict(t: MemberLoyaltyPointTxn, *, member_name: str = "") -> dict[str, Any]:
    return {
        "id": t.id,
        "member_id": t.member_id,
        "member_name": member_name,
        "campaign_id": t.campaign_id,
        "txn_type": t.txn_type,
        "points": int(t.points or 0),
        "reason": t.reason,
        "created_at": t.created_at.isoformat() if t.created_at else "",
    }


def outreach_dict(
    o: MemberLoyaltyOutreach,
    *,
    member_name: str = "",
    campaign_name: str = "",
) -> dict[str, Any]:
    return {
        "id": o.id,
        "member_id": o.member_id,
        "member_name": member_name,
        "campaign_id": o.campaign_id,
        "campaign_name": campaign_name,
        "message": o.message,
        "status": o.status,
        "created_at": o.created_at.isoformat() if o.created_at else "",
    }


def list_members(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
    status: str | None = None,
    min_points: int | None = None,
) -> list[dict[str, Any]]:
    q = db.query(MemberLoyaltyMember).filter(MemberLoyaltyMember.tenant_id == tenant_id)
    if app_public_id:
        q = q.filter(MemberLoyaltyMember.app_public_id == app_public_id)
    rows = q.order_by(MemberLoyaltyMember.created_at.desc()).limit(300).all()
    out: list[dict[str, Any]] = []
    for m in rows:
        d = member_dict(m)
        if status and d["status"] != status:
            continue
        if min_points is not None and d["points"] < min_points:
            continue
        out.append(d)
    return out


def create_member(
    db: Session,
    user: User,
    *,
    name: str,
    phone: str = "",
    points: int = 0,
    app_public_id: str = "",
) -> dict[str, Any]:
    m = MemberLoyaltyMember(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        name=(name or "").strip() or "未命名会员",
        phone=(phone or "").strip(),
        points=max(0, int(points)),
        last_visit_at=_now(),
        status="active",
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return member_dict(m)


def list_campaigns(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
) -> list[dict[str, Any]]:
    q = db.query(MemberLoyaltyCampaign).filter(MemberLoyaltyCampaign.tenant_id == tenant_id)
    if app_public_id:
        q = q.filter(MemberLoyaltyCampaign.app_public_id == app_public_id)
    return [campaign_dict(c) for c in q.order_by(MemberLoyaltyCampaign.created_at.desc()).limit(100).all()]


def create_campaign(
    db: Session,
    user: User,
    *,
    name: str,
    campaign_type: str = "points",
    rule_text: str = "",
    points_delta: int = 0,
    app_public_id: str = "",
) -> dict[str, Any]:
    ctype = (campaign_type or "points").strip().lower()
    if ctype not in ("points", "redeem", "wake"):
        ctype = "points"
    c = MemberLoyaltyCampaign(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        name=(name or "").strip() or "未命名活动",
        campaign_type=ctype,
        rule_text=(rule_text or "").strip(),
        points_delta=int(points_delta),
        status="active",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title=f"会员活动 · {c.name}",
            content=f"类型：{c.campaign_type} · 积分变动：{c.points_delta}\n{c.rule_text[:160]}",
            app_public_id=c.app_public_id,
            path="/member-loyalty",
            link_label="打开会员营销",
        )
    except Exception:
        pass
    return campaign_dict(c)


def apply_points(
    db: Session,
    user: User,
    *,
    member_id: str,
    points: int,
    txn_type: str = "earn",
    reason: str = "",
    campaign_id: str = "",
    app_public_id: str = "",
) -> dict[str, Any] | None:
    m = (
        db.query(MemberLoyaltyMember)
        .filter(MemberLoyaltyMember.tenant_id == user.tenant_id, MemberLoyaltyMember.id == member_id)
        .first()
    )
    if not m:
        return None
    t = (txn_type or "earn").strip().lower()
    if t not in ("earn", "redeem"):
        t = "earn"
    delta = abs(int(points))
    if t == "redeem":
        delta = -delta
    m.points = max(0, int(m.points or 0) + delta)
    m.last_visit_at = _now()
    _refresh_member_status(m)
    txn = MemberLoyaltyPointTxn(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or m.app_public_id or "").strip(),
        reporter_id=user.id,
        member_id=m.id,
        campaign_id=(campaign_id or "").strip(),
        txn_type=t,
        points=abs(int(points)),
        reason=(reason or "").strip() or ("积分入账" if t == "earn" else "积分兑礼"),
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title=f"积分{ '入账' if t == 'earn' else '兑礼' } · {m.name}",
            content=f"{abs(int(points))} 分 · 余额 {m.points}\n{txn.reason}",
            app_public_id=m.app_public_id,
            path="/member-loyalty",
            link_label="打开会员营销",
        )
    except Exception:
        pass
    return {"member": member_dict(m), "txn": txn_dict(txn, member_name=m.name)}


def list_txns(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
) -> list[dict[str, Any]]:
    q = db.query(MemberLoyaltyPointTxn).filter(MemberLoyaltyPointTxn.tenant_id == tenant_id)
    if app_public_id:
        q = q.filter(MemberLoyaltyPointTxn.app_public_id == app_public_id)
    rows = q.order_by(MemberLoyaltyPointTxn.created_at.desc()).limit(200).all()
    member_ids = {r.member_id for r in rows}
    names = {
        m.id: m.name
        for m in db.query(MemberLoyaltyMember).filter(MemberLoyaltyMember.id.in_(member_ids)).all()
    } if member_ids else {}
    return [txn_dict(r, member_name=names.get(r.member_id, "")) for r in rows]


def create_outreach(
    db: Session,
    user: User,
    *,
    member_id: str,
    campaign_id: str = "",
    message: str = "",
    app_public_id: str = "",
) -> dict[str, Any] | None:
    m = (
        db.query(MemberLoyaltyMember)
        .filter(MemberLoyaltyMember.tenant_id == user.tenant_id, MemberLoyaltyMember.id == member_id)
        .first()
    )
    if not m:
        return None
    camp_name = ""
    cid = (campaign_id or "").strip()
    if cid:
        c = (
            db.query(MemberLoyaltyCampaign)
            .filter(MemberLoyaltyCampaign.tenant_id == user.tenant_id, MemberLoyaltyCampaign.id == cid)
            .first()
        )
        if c:
            camp_name = c.name
            if not message.strip():
                message = f"【活动】{c.name}：{c.rule_text or f'积分变动 {c.points_delta}'}"
    row = MemberLoyaltyOutreach(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or m.app_public_id or "").strip(),
        reporter_id=user.id,
        member_id=m.id,
        campaign_id=cid,
        message=(message or "").strip() or f"尊敬的{m.name}，欢迎到店参与会员活动。",
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return outreach_dict(row, member_name=m.name, campaign_name=camp_name)


def mark_outreach_sent(db: Session, tenant_id: str, outreach_id: str) -> dict[str, Any] | None:
    row = (
        db.query(MemberLoyaltyOutreach)
        .filter(MemberLoyaltyOutreach.tenant_id == tenant_id, MemberLoyaltyOutreach.id == outreach_id)
        .first()
    )
    if not row:
        return None
    if row.status == "sent":
        m = db.query(MemberLoyaltyMember).filter(MemberLoyaltyMember.id == row.member_id).first()
        return outreach_dict(row, member_name=m.name if m else "")
    row.status = "sent"
    db.commit()
    db.refresh(row)
    m = db.query(MemberLoyaltyMember).filter(MemberLoyaltyMember.id == row.member_id).first()
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title=f"会员触达 · {m.name if m else ''}",
            content=(row.message or "")[:200],
            app_public_id=row.app_public_id,
            path="/member-loyalty",
            link_label="打开会员营销",
        )
    except Exception:
        pass
    return outreach_dict(row, member_name=m.name if m else "")


def list_outreaches(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
) -> list[dict[str, Any]]:
    q = db.query(MemberLoyaltyOutreach).filter(MemberLoyaltyOutreach.tenant_id == tenant_id)
    if app_public_id:
        q = q.filter(MemberLoyaltyOutreach.app_public_id == app_public_id)
    rows = q.order_by(MemberLoyaltyOutreach.created_at.desc()).limit(200).all()
    member_ids = {r.member_id for r in rows}
    camp_ids = {r.campaign_id for r in rows if r.campaign_id}
    names = {
        m.id: m.name
        for m in db.query(MemberLoyaltyMember).filter(MemberLoyaltyMember.id.in_(member_ids)).all()
    } if member_ids else {}
    camps = {
        c.id: c.name
        for c in db.query(MemberLoyaltyCampaign).filter(MemberLoyaltyCampaign.id.in_(camp_ids)).all()
    } if camp_ids else {}
    return [
        outreach_dict(r, member_name=names.get(r.member_id, ""), campaign_name=camps.get(r.campaign_id, ""))
        for r in rows
    ]


# --- 兼容旧 API（单表登记）---
def list_records(db: Session, tenant_id: str, *, app_public_id: str | None = None, status: str | None = None) -> list[dict]:
    return list_outreaches(db, tenant_id, app_public_id=app_public_id)
