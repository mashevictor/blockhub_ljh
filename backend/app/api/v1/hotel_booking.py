"""CapShip · hotel_booking API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import hotel_booking_store as store

router = APIRouter(prefix="/hotel-booking", tags=["hotel-booking"])


class CreateBody(BaseModel):
    guest_name: str = Field(min_length=1, max_length=120)
    room_type: str = ""
    check_in: str = ""
    check_out: str = ""
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
    if not body.guest_name.strip():
        raise HTTPException(status_code=400, detail="客人姓名不能为空")
    item = store.create_record(
        db,
        user,
        guest_name=body.guest_name,
        room_type=body.room_type,
        check_in=body.check_in,
        check_out=body.check_out,
        note=body.note,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "record": item}


@router.post("/records/{record_id}/check-in")
def check_in_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.mark_checked_in(db, user.tenant_id, record_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}


@router.post("/records/{record_id}/cancel")
def cancel_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.mark_cancelled(db, user.tenant_id, record_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}
