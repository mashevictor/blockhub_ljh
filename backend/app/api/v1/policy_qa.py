"""CapShip · policy_qa API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import policy_qa_store as store

router = APIRouter(prefix="/policy-qa", tags=["policy-qa"])


class CreateBody(BaseModel):
    category: str = ""
    title: str = Field(min_length=1, max_length=200)
    dept: str = ""
    answer: str = ""
    note: str = ""
    app_public_id: str = Field(default="", max_length=64)


class AnswerBody(BaseModel):
    query: str = Field(min_length=1, max_length=200)
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


@router.post("/answer")
def answer_api(
    body: AnswerBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    q = body.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="请先输入制度或福利问题")
    result = store.answer_question(db, user, query=q, app_public_id=body.app_public_id)
    if not result.get("ok"):
        raise HTTPException(status_code=503, detail=result.get("error") or "无法答复")
    return {"success": True, "record": result.get("record")}


@router.post("/records")
def create_api(body: CreateBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="必填项不能为空")
    item = store.create_record(
        db,
        user,
        category=body.category,
        title=body.title,
        dept=body.dept,
        answer=body.answer,
        note=body.note,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "record": item}


@router.post("/records/{record_id}/answered")
def answered_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.mark_answered(db, user.tenant_id, record_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}


@router.post("/records/{record_id}/archived")
def archived_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.mark_archived(db, user.tenant_id, record_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}

