"""CapShip · member_loyalty API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import member_loyalty_store as store

router = APIRouter(prefix="/member-loyalty", tags=["member-loyalty"])


class CreateBody(BaseModel):
    member_name: str = Field(min_length=1, max_length=120)
    campaign_name: str = Field(default="", max_length=200)
    points: int = 0
    member_phone: str = ""
    note: str = ""
    app_public_id: str = Field(default="", max_length=64)


@router.get("/records")
def list_api(
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_records(db, user.tenant_id, app_public_id=app_id or None, status=status)
    return {"total": len(items), "items": items}


@router.post("/records")
def create_api(body: CreateBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if not body.member_name.strip():
        raise HTTPException(status_code=400, detail="会员姓名不能为空")
    item = store.create_record(
        db,
        user,
        member_name=body.member_name,
        campaign_name=body.campaign_name,
        points=body.points,
        member_phone=body.member_phone,
        note=body.note,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "record": item}


@router.post("/records/{record_id}/send")
def send_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.mark_sent(db, user.tenant_id, record_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}
