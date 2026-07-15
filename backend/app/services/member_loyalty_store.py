"""CapShip · member_loyalty 会员营销。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import MemberLoyaltyRecord, User

VALID_STATUS = frozenset({"pending", "sent"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"ML-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: MemberLoyaltyRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "member_name": row.member_name,
        "member_phone": row.member_phone,
        "campaign_name": row.campaign_name,
        "points": int(row.points or 0),
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
        db.query(MemberLoyaltyRecord)
        .options(joinedload(MemberLoyaltyRecord.reporter))
        .filter(MemberLoyaltyRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(MemberLoyaltyRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(MemberLoyaltyRecord.status == status)
    return [to_dict(r) for r in q.order_by(MemberLoyaltyRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    member_name: str,
    campaign_name: str,
    points: int = 0,
    member_phone: str = "",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    row = MemberLoyaltyRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        member_name=(member_name or "").strip() or "未命名会员",
        member_phone=(member_phone or "").strip(),
        campaign_name=(campaign_name or "").strip() or "未填活动",
        points=max(0, int(points)),
        note=(note or "").strip(),
        status="pending",
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
            title="会员营销 · 待触达",
            content=(
                f"{row.record_no} · {row.member_name} · {row.campaign_name}\n"
                f"积分：{row.points}\n{(row.note or '')[:160]}"
            ),
            app_public_id=row.app_public_id,
            path="/member-loyalty",
            link_label="打开会员营销",
        )
    except Exception:
        pass
    return to_dict(row)


def mark_sent(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(MemberLoyaltyRecord)
        .options(joinedload(MemberLoyaltyRecord.reporter))
        .filter(MemberLoyaltyRecord.tenant_id == tenant_id, MemberLoyaltyRecord.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "sent":
        return to_dict(row)
    row.status = "sent"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=tenant_id,
            title="会员营销 · 已触达",
            content=f"{row.record_no} · {row.member_name} · {row.campaign_name} · 已确认发送",
            app_public_id=row.app_public_id,
            path="/member-loyalty",
            link_label="打开会员营销",
        )
    except Exception:
        pass
    return to_dict(row)
