"""CapShip · site_patrol API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import site_patrol_store as store

router = APIRouter(prefix="/site-patrol", tags=["site-patrol"])


class CreateBody(BaseModel):
    site_name: str = Field(min_length=1, max_length=120)
    checkpoint: str = ""
    result: str = "ok"
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
    if not body.site_name.strip():
        raise HTTPException(status_code=400, detail="站点名称不能为空")
    item = store.create_record(
        db,
        user,
        site_name=body.site_name,
        checkpoint=body.checkpoint,
        result=body.result,
        note=body.note,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "record": item}


@router.post("/records/{record_id}/close")
def close_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.mark_closed(db, user.tenant_id, record_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}
