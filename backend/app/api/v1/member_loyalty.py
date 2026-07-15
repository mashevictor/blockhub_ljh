"""CapShip · member_loyalty API（会员 / 活动 / 流水 / 触达）。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import member_loyalty_store as store

router = APIRouter(prefix="/member-loyalty", tags=["member-loyalty"])


class MemberBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = ""
    points: int = 0
    app_public_id: str = Field(default="", max_length=64)


class CampaignBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    campaign_type: str = "points"
    rule_text: str = ""
    points_delta: int = 0
    app_public_id: str = Field(default="", max_length=64)


class PointsBody(BaseModel):
    member_id: str
    points: int = Field(ge=1)
    txn_type: str = "earn"
    reason: str = ""
    campaign_id: str = ""
    app_public_id: str = Field(default="", max_length=64)


class OutreachBody(BaseModel):
    member_id: str
    campaign_id: str = ""
    message: str = ""
    app_public_id: str = Field(default="", max_length=64)


@router.get("/members")
def list_members(
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    min_points: int | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_members(
        db, user.tenant_id, app_public_id=app_id or None, status=status, min_points=min_points
    )
    return {"total": len(items), "items": items}


@router.post("/members")
def create_member(body: MemberBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="会员姓名不能为空")
    item = store.create_member(
        db, user, name=body.name, phone=body.phone, points=body.points, app_public_id=body.app_public_id
    )
    return {"success": True, "member": item}


@router.get("/campaigns")
def list_campaigns(
    app_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_campaigns(db, user.tenant_id, app_public_id=app_id or None)
    return {"total": len(items), "items": items}


@router.post("/campaigns")
def create_campaign(body: CampaignBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.create_campaign(
        db,
        user,
        name=body.name,
        campaign_type=body.campaign_type,
        rule_text=body.rule_text,
        points_delta=body.points_delta,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "campaign": item}


@router.get("/point-txns")
def list_txns(
    app_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_txns(db, user.tenant_id, app_public_id=app_id or None)
    return {"total": len(items), "items": items}


@router.post("/point-txns")
def apply_points(body: PointsBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.apply_points(
        db,
        user,
        member_id=body.member_id,
        points=body.points,
        txn_type=body.txn_type,
        reason=body.reason,
        campaign_id=body.campaign_id,
        app_public_id=body.app_public_id,
    )
    if not item:
        raise HTTPException(status_code=404, detail="会员不存在")
    return {"success": True, **item}


@router.get("/outreaches")
def list_outreaches(
    app_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_outreaches(db, user.tenant_id, app_public_id=app_id or None)
    return {"total": len(items), "items": items}


@router.post("/outreaches")
def create_outreach(body: OutreachBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.create_outreach(
        db,
        user,
        member_id=body.member_id,
        campaign_id=body.campaign_id,
        message=body.message,
        app_public_id=body.app_public_id,
    )
    if not item:
        raise HTTPException(status_code=404, detail="会员不存在")
    return {"success": True, "outreach": item}


@router.post("/outreaches/{outreach_id}/send")
def send_outreach(outreach_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.mark_outreach_sent(db, user.tenant_id, outreach_id)
    if not item:
        raise HTTPException(status_code=404, detail="触达记录不存在")
    return {"success": True, "outreach": item}


# 兼容旧路径：映射到 outreaches
@router.get("/records")
def list_records_compat(
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _ = status
    items = store.list_outreaches(db, user.tenant_id, app_public_id=app_id or None)
    return {"total": len(items), "items": items}
