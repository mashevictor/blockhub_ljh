"""CapShip · 零售电商共享记录（库存预警/订单/退换货/对账/调价/陈列等） API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import retail_ops_store as store

router = APIRouter(prefix="/retail-ops", tags=["retail-ops"])


class CreateBody(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    field_a: str = ""
    field_b: str = ""
    field_c: str = ""
    field_d: str = ""
    note: str = ""
    app_public_id: str = Field(default="", max_length=64)


@router.get("/stats")
def stats_api(
    app_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return store.stats(db, user.tenant_id, app_public_id=app_id or None)


@router.get("/{kind}/records")
def list_api(
    kind: str,
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if kind not in store.KINDS:
        raise HTTPException(status_code=404, detail="未知零售能力")
    items = store.list_records(
        db, user.tenant_id, kind=kind, app_public_id=app_id or None, status=status
    )
    return {"total": len(items), "items": items}


@router.post("/{kind}/records")
def create_api(
    kind: str,
    body: CreateBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if kind not in store.KINDS:
        raise HTTPException(status_code=404, detail="未知零售能力")
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="标题不能为空")
    try:
        item = store.create_record(
            db,
            user,
            kind=kind,
            title=body.title,
            field_a=body.field_a,
            field_b=body.field_b,
            field_c=body.field_c,
            field_d=body.field_d,
            note=body.note,
            app_public_id=body.app_public_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"success": True, "record": item}


@router.post("/{kind}/records/{record_id}/{action}")
def action_api(
    kind: str,
    record_id: str,
    action: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if kind not in store.KINDS:
        raise HTTPException(status_code=404, detail="未知零售能力")
    status_map = {
        "done": "done",
        "close": "closed",
        "approve": "approved",
        "reject": "rejected",
        "reopen": "open",
    }
    status = status_map.get(action)
    if not status:
        raise HTTPException(status_code=400, detail="不支持的动作")
    item = store.set_status(db, user.tenant_id, record_id, status)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}
