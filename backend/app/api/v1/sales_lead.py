"""CapShip · sales_lead API（获客方法 + 漏斗）。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import sales_lead_store as store

router = APIRouter(prefix="/sales-lead", tags=["sales-lead"])


class CreateBody(BaseModel):
    category: str = ""
    customer: str = Field(min_length=1, max_length=200)
    amount: str = ""
    owner: str = ""
    note: str = ""
    source: str = ""
    referrer: str = ""
    pool_status: str = "private"
    app_public_id: str = Field(default="", max_length=64)


class AssignBody(BaseModel):
    lead_key: str = Field(min_length=1, max_length=200)
    assignee: str = Field(min_length=1, max_length=120)
    assignee_user_id: str = ""
    note: str = ""
    app_public_id: str = ""


class CleanBody(BaseModel):
    lead_key: str = Field(min_length=1, max_length=200)
    result: str = Field(min_length=1, max_length=32)
    reason: str = ""
    app_public_id: str = ""


class ClaimBody(BaseModel):
    lead_key: str = Field(min_length=1, max_length=200)
    reason: str = ""
    app_public_id: str = ""


class ReleaseBody(BaseModel):
    lead_key: str = Field(min_length=1, max_length=200)
    reason: str = ""
    app_public_id: str = ""


class ScoreBody(BaseModel):
    lead_key: str = Field(min_length=1, max_length=200)
    score: int = Field(ge=1, le=100)
    comment: str = ""
    app_public_id: str = ""


def _resolve(db: Session, user: User, lead_key: str, app_public_id: str = "") -> str:
    rid = store.resolve_lead_id(db, user.tenant_id, lead_key, app_public_id=app_public_id or None)
    if not rid:
        raise HTTPException(status_code=404, detail="线索不存在（可用客户名/单号/ID）")
    return rid


@router.get("/funnel")
def funnel_api(
    app_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    stages = store.funnel_stats(db, user.tenant_id, app_public_id=app_id or None)
    return {"total": len(stages), "stages": stages, "items": stages}


@router.get("/channel-stats")
def channel_stats_api(
    app_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.channel_stats(db, user.tenant_id, app_public_id=app_id or None)
    return {"total": len(items), "items": items}


@router.get("/stale")
def stale_api(
    app_id: str | None = Query(None),
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.stale_opportunities(db, user.tenant_id, app_public_id=app_id or None, days=days)
    return {"total": len(items), "items": items, "days": days}


@router.get("/records")
def list_api(
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    category: str | None = Query(None),
    pool_status: str | None = Query(None),
    mine: bool = Query(False),
    role: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_records(
        db,
        user.tenant_id,
        user=user,
        app_public_id=app_id or None,
        status=status,
        category=category,
        pool_status=pool_status,
        mine=mine,
        role=role,
    )
    return {"total": len(items), "items": items}


@router.post("/records")
def create_api(body: CreateBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if not body.customer.strip():
        raise HTTPException(status_code=400, detail="必填项不能为空")
    try:
        item = store.create_record(
            db,
            user,
            category=body.category,
            customer=body.customer,
            amount=body.amount,
            owner=body.owner,
            note=body.note,
            source=body.source,
            referrer=body.referrer,
            pool_status=body.pool_status,
            app_public_id=body.app_public_id,
        )
    except store.AcqError as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    return {"success": True, "record": item}


@router.post("/records/assign")
def assign_api(body: AssignBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    rid = _resolve(db, user, body.lead_key, body.app_public_id)
    try:
        item = store.assign_record(
            db,
            user.tenant_id,
            rid,
            assignee=body.assignee,
            assignee_user_id=body.assignee_user_id,
            note=body.note,
        )
    except store.AcqError as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    return {"success": True, "record": item}


@router.post("/records/clean")
def clean_api(body: CleanBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    rid = _resolve(db, user, body.lead_key, body.app_public_id)
    try:
        item = store.clean_record(db, user.tenant_id, rid, result=body.result, reason=body.reason)
    except store.AcqError as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    return {"success": True, "record": item}


@router.post("/records/claim")
def claim_api(body: ClaimBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    rid = _resolve(db, user, body.lead_key, body.app_public_id)
    try:
        item = store.claim_record(db, user, rid, reason=body.reason)
    except store.AcqError as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    return {"success": True, "record": item}


@router.post("/records/release")
def release_api(body: ReleaseBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    rid = _resolve(db, user, body.lead_key, body.app_public_id)
    try:
        item = store.release_record(db, user.tenant_id, rid, reason=body.reason)
    except store.AcqError as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    return {"success": True, "record": item}


@router.post("/records/score")
def score_api(body: ScoreBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    rid = _resolve(db, user, body.lead_key, body.app_public_id)
    try:
        item = store.score_record(db, user.tenant_id, rid, score=body.score, comment=body.comment)
    except store.AcqError as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    return {"success": True, "record": item}


@router.post("/records/{record_id}/following")
def following_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        item = store.mark_following(db, user.tenant_id, record_id)
    except store.EvidenceGateError as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}


@router.post("/records/{record_id}/won")
def won_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    try:
        item = store.mark_won(db, user.tenant_id, record_id)
    except store.EvidenceGateError as e:
        raise HTTPException(status_code=400, detail=e.detail) from e
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}


@router.post("/records/{record_id}/lost")
def lost_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.mark_lost(db, user.tenant_id, record_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}
