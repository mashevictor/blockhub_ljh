"""CapShip · study_coach API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import study_coach_store as store

router = APIRouter(prefix="/study-coach", tags=["study-coach"])


class CreateCourseBody(BaseModel):
    textbook_name: str = Field(min_length=1, max_length=200)
    subject: str = ""
    grade: str = ""
    role: str = "student"
    student_name: str = ""
    app_public_id: str = Field(default="", max_length=64)


class ProgressBody(BaseModel):
    order: int = Field(ge=1, le=50)
    status: str = "learning"


class CreateDrillBody(BaseModel):
    course_id: str = Field(min_length=1, max_length=36)
    unit_name: str = Field(min_length=1, max_length=200)
    kind: str = "review"
    score: str = ""
    result: str = ""
    notes: str = ""
    app_public_id: str = Field(default="", max_length=64)


@router.get("/courses")
def list_courses_api(
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_courses(db, user.tenant_id, app_public_id=app_id or None, status=status)
    return {"total": len(items), "items": items}


@router.post("/courses")
def create_course_api(
    body: CreateCourseBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not body.textbook_name.strip():
        raise HTTPException(status_code=400, detail="课本名称不能为空")
    item = store.create_course(
        db,
        user,
        textbook_name=body.textbook_name,
        subject=body.subject,
        grade=body.grade,
        role=body.role,
        student_name=body.student_name,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "course": item}


@router.post("/courses/{course_id}/progress")
def progress_api(
    course_id: str,
    body: ProgressBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = store.update_unit_progress(
        db, user.tenant_id, course_id, order=body.order, status=body.status
    )
    if not item:
        raise HTTPException(status_code=404, detail="课程或单元不存在")
    return {"success": True, "course": item}


@router.get("/drills")
def list_drills_api(
    app_id: str | None = Query(None),
    course_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_drills(
        db, user.tenant_id, app_public_id=app_id or None, course_id=course_id or None
    )
    return {"total": len(items), "items": items}


@router.post("/drills")
def create_drill_api(
    body: CreateDrillBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = store.create_drill(
        db,
        user,
        course_id=body.course_id,
        unit_name=body.unit_name,
        kind=body.kind,
        score=body.score,
        result=body.result,
        notes=body.notes,
        app_public_id=body.app_public_id,
    )
    if not item:
        raise HTTPException(status_code=404, detail="课程不存在")
    return {"success": True, "drill": item}
