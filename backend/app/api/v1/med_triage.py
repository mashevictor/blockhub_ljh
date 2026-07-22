"""CapShip · med_triage API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import med_triage_store as store

router = APIRouter(prefix="/med-triage", tags=["med-triage"])


class CreateBody(BaseModel):
    symptoms: str = Field(min_length=1, max_length=2000)
    patient_name: str = ""
    suggested_dept: str = ""
    urgency: str = "normal"
    note: str = ""
    app_public_id: str = Field(default="", max_length=64)


class SuggestBody(BaseModel):
    symptoms: str = Field(min_length=1, max_length=2000)


@router.get("/records")
def list_api(
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_records(db, user.tenant_id, app_public_id=app_id or None, status=status)
    return {"total": len(items), "items": items}


@router.post("/suggest-dept")
def suggest_api(body: SuggestBody, user: User = Depends(get_current_user)) -> dict:
    _ = user
    detail = store.suggest_dept_detail(body.symptoms, use_ai=True)
    return detail


@router.post("/records")
def create_api(body: CreateBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if not body.symptoms.strip():
        raise HTTPException(status_code=400, detail="症状描述不能为空")
    item = store.create_record(
        db,
        user,
        symptoms=body.symptoms,
        patient_name=body.patient_name,
        suggested_dept=body.suggested_dept,
        urgency=body.urgency,
        note=body.note,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "record": item}


@router.post("/records/{record_id}/guided")
def guided_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.mark_guided(db, user.tenant_id, record_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}
