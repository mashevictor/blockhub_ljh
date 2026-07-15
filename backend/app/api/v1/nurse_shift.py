"""CapShip · nurse_shift API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import nurse_shift_store as store

router = APIRouter(prefix="/nurse-shift", tags=["nurse-shift"])


class CreateBody(BaseModel):
    nurse_name: str = ""
    shift_date: str = Field(min_length=1, max_length=32)
    from_shift: str = ""
    to_shift: str = ""
    reason: str = ""
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
    if not body.shift_date.strip():
        raise HTTPException(status_code=400, detail="值班日期不能为空")
    item = store.create_record(
        db,
        user,
        nurse_name=body.nurse_name,
        shift_date=body.shift_date,
        from_shift=body.from_shift,
        to_shift=body.to_shift,
        reason=body.reason,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "record": item}


@router.post("/records/{record_id}/approve")
def approve_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.decide_record(db, user.tenant_id, record_id, approve=True)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}


@router.post("/records/{record_id}/reject")
def reject_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.decide_record(db, user.tenant_id, record_id, approve=False)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}
