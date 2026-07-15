"""CapShip · game_support API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import game_support_store as store

router = APIRouter(prefix="/game-support", tags=["game-support"])


class CreateBody(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = ""
    category: str = "ticket"
    player_name: str = ""
    app_public_id: str = Field(default="", max_length=64)


@router.get("/records")
def list_api(
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    category: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_records(
        db, user.tenant_id, app_public_id=app_id or None, status=status, category=category
    )
    return {"total": len(items), "items": items}


@router.post("/records")
def create_api(body: CreateBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="标题不能为空")
    item = store.create_record(
        db,
        user,
        title=body.title,
        content=body.content,
        category=body.category,
        player_name=body.player_name,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "record": item}


@router.post("/records/{record_id}/close")
def close_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.close_record(db, user.tenant_id, record_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}
