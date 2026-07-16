"""CapShip · asset_manage API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import asset_manage_store as store

router = APIRouter(prefix="/asset-manage", tags=["asset-manage"])


class CreateBody(BaseModel):
    category: str = "borrow"
    asset_name: str = Field(min_length=1, max_length=200)
    asset_code: str = ""
    quantity: str = "1"
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
    if not body.asset_name.strip():
        raise HTTPException(status_code=400, detail="资产名称不能为空")
    item = store.create_record(
        db,
        user,
        category=body.category,
        asset_name=body.asset_name,
        asset_code=body.asset_code,
        quantity=body.quantity,
        note=body.note,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "record": item}


@router.post("/records/{record_id}/{action}")
def action_api(
    record_id: str,
    action: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = store.advance(db, user.tenant_id, record_id, action)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}
