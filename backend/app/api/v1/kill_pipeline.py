"""CapShip · kill_pipeline API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import kill_pipeline_store as store

router = APIRouter(prefix="/kill-pipeline", tags=["kill-pipeline"])


class CreateBody(BaseModel):
    customer: str = Field(min_length=1, max_length=200)
    kill_reason: str = "other"
    learning: str = ""
    amount_lost: str = ""
    competitor: str = ""
    lead_id: str = ""
    app_public_id: str = Field(default="", max_length=64)


@router.get("/records")
def list_api(
    app_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_records(db, user.tenant_id, app_public_id=app_id or None)
    return {"total": len(items), "items": items}


@router.get("/reasons")
def reasons_api(
    app_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.reason_stats(db, user.tenant_id, app_public_id=app_id or None)
    return {"total": len(items), "items": items}


@router.post("/records")
def create_api(body: CreateBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if not body.customer.strip():
        raise HTTPException(status_code=400, detail="客户名称不能为空")
    item = store.create_record(
        db,
        user,
        customer=body.customer,
        kill_reason=body.kill_reason,
        learning=body.learning,
        amount_lost=body.amount_lost,
        competitor=body.competitor,
        lead_id=body.lead_id,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "record": item}
