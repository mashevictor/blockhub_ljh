"""CapShip · study_coach API。"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import study_coach_store as store

router = APIRouter(prefix="/study-coach", tags=["study-coach"])


class LocateBody(BaseModel):
    query: str = Field(min_length=1, max_length=200)
    role: str = "student"


class CreateCourseBody(BaseModel):
    textbook_name: str = ""
    query: str = ""
    subject: str = ""
    grade: str = ""
    role: str = "student"
    student_name: str = ""
    app_public_id: str = Field(default="", max_length=64)
    catalog: dict[str, Any] | None = None


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


class CompleteStepBody(BaseModel):
    unit_order: int = Field(ge=1, le=50)
    step_id: str = Field(min_length=1, max_length=40)
    done: bool = True


class ScheduleDoneBody(BaseModel):
    date: str = Field(min_length=8, max_length=16)
    unit_order: int = Field(ge=1, le=50)
    step_id: str = Field(min_length=1, max_length=40)
    done: bool = True


class RebuildScheduleBody(BaseModel):
    start_offset_days: int = Field(default=0, ge=0, le=30)


class SetCurrentUnitBody(BaseModel):
    unit_order: int = Field(ge=1, le=80)
    mark_previous_mastered: bool = True
    rebuild: bool = True


class TonightGenerateBody(BaseModel):
    course_id: str = Field(min_length=1, max_length=36)
    unit_order: int = Field(ge=1, le=80)
    template: str = Field(min_length=1, max_length=32)
    child_name: str = ""
    level: str = "中"
    note: str = ""
    app_public_id: str = Field(default="", max_length=64)


class TonightProgressBody(BaseModel):
    items: list[dict[str, Any]] = Field(default_factory=list)


class TonightCompleteBody(BaseModel):
    items: list[dict[str, Any]] | None = None
    complete_first_step: bool = True


@router.post("/locate")
def locate_api(
    body: LocateBody,
    user: User = Depends(get_current_user),
) -> dict:
    _ = user
    q = body.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="请先说一下课本名")
    role = body.role if body.role in ("student", "parent", "teacher") else "student"
    candidates = store.locate_textbooks(query=q, role=role)
    return {"total": len(candidates), "candidates": candidates, "query": q}


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
    title = (body.textbook_name or body.query or "").strip()
    if isinstance(body.catalog, dict):
        title = title or str(body.catalog.get("full_title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="请先确认课本")
    item = store.create_course(
        db,
        user,
        textbook_name=title,
        subject=body.subject,
        grade=body.grade,
        role=body.role,
        student_name=body.student_name,
        app_public_id=body.app_public_id,
        catalog=body.catalog,
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


@router.get("/courses/{course_id}/today")
def today_api(
    course_id: str,
    on_date: str | None = Query(None, description="YYYY-MM-DD，默认今天"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    from datetime import date as date_cls

    from app.db.models import StudyCoachCourse

    row = (
        db.query(StudyCoachCourse)
        .filter(StudyCoachCourse.tenant_id == user.tenant_id, StudyCoachCourse.id == course_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="课程不存在")
    course = store.course_to_dict(row)
    day = on_date or date_cls.today().isoformat()
    items = store.today_tasks(course, on_date=day)
    return {
        "course_id": course_id,
        "date": day,
        "total": len(items),
        "items": items,
        "subject_tips": course.get("subject_tips") or {},
        "progress_pct": course.get("progress_pct") or 0,
    }


@router.post("/courses/{course_id}/steps/complete")
def complete_step_api(
    course_id: str,
    body: CompleteStepBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = store.complete_step(
        db,
        user.tenant_id,
        course_id,
        unit_order=body.unit_order,
        step_id=body.step_id,
        done=body.done,
    )
    if not item:
        raise HTTPException(status_code=404, detail="课程或小步骤不存在")
    return {"success": True, "course": item}


@router.post("/courses/{course_id}/schedule/done")
def schedule_done_api(
    course_id: str,
    body: ScheduleDoneBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = store.complete_schedule_item(
        db,
        user.tenant_id,
        course_id,
        date=body.date,
        unit_order=body.unit_order,
        step_id=body.step_id,
        done=body.done,
    )
    if not item:
        raise HTTPException(status_code=404, detail="日程项不存在")
    return {"success": True, "course": item}


@router.post("/courses/{course_id}/schedule/rebuild")
def rebuild_schedule_api(
    course_id: str,
    body: RebuildScheduleBody | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    offset = body.start_offset_days if body else 0
    item = store.rebuild_schedule(
        db, user.tenant_id, course_id, start_offset_days=offset
    )
    if not item:
        raise HTTPException(status_code=404, detail="课程不存在")
    return {"success": True, "course": item}


@router.post("/courses/{course_id}/units/set-current")
def set_current_unit_api(
    course_id: str,
    body: SetCurrentUnitBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = store.set_current_unit(
        db,
        user.tenant_id,
        course_id,
        unit_order=body.unit_order,
        mark_previous_mastered=body.mark_previous_mastered,
        rebuild=body.rebuild,
    )
    if not item:
        raise HTTPException(status_code=404, detail="课程或单元不存在")
    return {"success": True, "course": item}


@router.get("/toc/books")
def toc_books_api(
    user: User = Depends(get_current_user),
) -> dict:
    """已入库真实目录册次（无正文）。"""
    _ = user
    from app.services import textbook_toc as toc_lib

    items = []
    for b in toc_lib.list_books():
        mods, units = toc_lib.flatten_toc_units(b)
        items.append(
            {
                "id": b.get("id"),
                "full_title": b.get("full_title"),
                "subject": b.get("subject"),
                "grade": b.get("grade"),
                "semester": b.get("semester"),
                "edition_label": b.get("edition_label"),
                "module_count": len(mods),
                "unit_count": len(units),
                "aliases": b.get("aliases") or [],
            }
        )
    return {"total": len(items), "items": items}


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


@router.get("/tonight/templates")
def tonight_templates_api(user: User = Depends(get_current_user)) -> dict:
    _ = user
    items = [
        {"key": k, "label": store.TEMPLATE_LABEL.get(k, k)}
        for k in (
            "dictation",
            "word_cards",
            "math_drill",
            "wrongbook",
            "read_aloud",
        )
    ]
    return {"total": len(items), "items": items}


@router.get("/tonight")
def list_tonight_api(
    course_id: str | None = Query(None),
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_tonight(
        db,
        user.tenant_id,
        course_id=course_id or None,
        app_public_id=app_id or None,
        status=status,
    )
    return {"total": len(items), "items": items}


@router.get("/tonight/{tonight_id}")
def get_tonight_api(
    tonight_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = store.get_tonight(db, user.tenant_id, tonight_id)
    if not item:
        raise HTTPException(status_code=404, detail="练习不存在")
    return {"item": item}


@router.post("/tonight/generate")
def generate_tonight_api(
    body: TonightGenerateBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        item = store.generate_tonight(
            db,
            user,
            course_id=body.course_id,
            unit_order=body.unit_order,
            template=body.template,
            child_name=body.child_name,
            level=body.level,
            note=body.note,
            app_public_id=body.app_public_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if not item:
        raise HTTPException(status_code=404, detail="课程不存在")
    return {"success": True, "tonight": item}


@router.post("/tonight/{tonight_id}/start")
def start_tonight_api(
    tonight_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        item = store.start_tonight(db, user.tenant_id, tonight_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if not item:
        raise HTTPException(status_code=404, detail="练习不存在")
    return {"success": True, "tonight": item}


@router.post("/tonight/{tonight_id}/progress")
def progress_tonight_api(
    tonight_id: str,
    body: TonightProgressBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = store.save_tonight_progress(db, user.tenant_id, tonight_id, items=body.items)
    if not item:
        raise HTTPException(status_code=404, detail="练习不存在")
    return {"success": True, "tonight": item}


@router.post("/tonight/{tonight_id}/complete")
def complete_tonight_api(
    tonight_id: str,
    body: TonightCompleteBody | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    b = body or TonightCompleteBody()
    item = store.complete_tonight(
        db,
        user,
        tonight_id,
        items=b.items,
        complete_first_step=b.complete_first_step,
    )
    if not item:
        raise HTTPException(status_code=404, detail="练习不存在")
    return {"success": True, "tonight": item}


@router.post("/tonight/{tonight_id}/record-only")
def record_tonight_api(
    tonight_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = store.record_tonight_without_practice(db, user, tonight_id)
    if not item:
        raise HTTPException(status_code=404, detail="练习不存在")
    return {"success": True, "tonight": item}
