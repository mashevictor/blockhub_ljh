"""CapShip · game_support 玩家 FAQ / 客服工单。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import GameSupportRecord, User

VALID_STATUS = frozenset({"open", "closed"})
VALID_CATEGORY = frozenset({"faq", "ticket"})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"GS-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: GameSupportRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "category": row.category,
        "title": row.title,
        "content": row.content,
        "player_name": row.player_name,
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
    category: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query(GameSupportRecord)
        .options(joinedload(GameSupportRecord.reporter))
        .filter(GameSupportRecord.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(GameSupportRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(GameSupportRecord.status == status)
    if category and category in VALID_CATEGORY:
        q = q.filter(GameSupportRecord.category == category)
    return [to_dict(r) for r in q.order_by(GameSupportRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    title: str,
    content: str,
    category: str = "ticket",
    player_name: str = "",
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "ticket").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "ticket"
    row = GameSupportRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
        category=cat,
        title=(title or "").strip() or "未填标题",
        content=(content or "").strip(),
        player_name=(player_name or "").strip() or (user.display_name or "玩家"),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event

        kind = "FAQ" if cat == "faq" else "客服工单"
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title=f"{kind} · 新提交",
            content=f"{row.record_no} · {row.player_name}\n{row.title}\n{(row.content or '')[:160]}",
            app_public_id=row.app_public_id,
            path="/game-support",
            link_label="打开玩家支持",
        )
    except Exception:
        pass
    return to_dict(row)


def close_record(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query(GameSupportRecord)
        .options(joinedload(GameSupportRecord.reporter))
        .filter(GameSupportRecord.tenant_id == tenant_id, GameSupportRecord.id == record_id)
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
            title="工单已关闭",
            content=f"{row.record_no} · {row.title} · 已关闭",
            app_public_id=row.app_public_id,
            path="/game-support",
            link_label="打开玩家支持",
        )
    except Exception:
        pass
    return to_dict(row)
