"""CapShip · it_ticket API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import it_ticket_store as store

router = APIRouter(prefix="/it-ticket", tags=["it-ticket"])


class CreateBody(BaseModel):
    category: str = "hardware"
    title: str = Field(min_length=1, max_length=200)
    detail: str = ""
    urgency: str = "medium"
    app_public_id: str = Field(default="", max_length=64)


@router.get("/tickets")
def list_api(
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_tickets(db, user.tenant_id, app_public_id=app_id or None, status=status)
    return {"total": len(items), "items": items}


@router.post("/tickets")
def create_api(body: CreateBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="标题不能为空")
    item = store.create_ticket(
        db,
        user,
        category=body.category,
        title=body.title,
        detail=body.detail,
        urgency=body.urgency,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "ticket": item}


@router.post("/tickets/{ticket_id}/{action}")
def action_api(
    ticket_id: str,
    action: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = store.advance(db, user.tenant_id, ticket_id, action)
    if not item:
        raise HTTPException(status_code=404, detail="工单不存在")
    return {"success": True, "ticket": item}
