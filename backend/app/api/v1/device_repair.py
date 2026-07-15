"""CapShip · device_repair 真实业务 API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import device_repair_store as store

router = APIRouter(prefix="/device-repair", tags=["device-repair"])


class CreateTicketBody(BaseModel):
    asset_code: str = Field(min_length=1, max_length=120)
    location: str = ""
    fault: str = Field(min_length=1, max_length=4000)
    app_public_id: str = Field(default="", max_length=64)


class ActionBody(BaseModel):
    action: str = Field(description="dispatch | complete | next")
    comment: str = ""
    assignee_id: str = ""
    assignee_name: str = Field(default="", max_length=120)


@router.get("/assignees")
def list_assignees_api(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """同租户可登录成员，供派工选人（群里其他人登录同一 Runtime 也能操作）。"""
    items = store.list_assignee_candidates(db, user.tenant_id)
    return {"total": len(items), "items": items}


@router.get("/tickets")
def list_tickets_api(
    app_id: str | None = Query(None, description="发布应用 public_id，隔离各 App 工单"),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_tickets(
        db,
        user.tenant_id,
        app_public_id=app_id or None,
        status=status,
    )
    return {"total": len(items), "items": items}


@router.post("/tickets")
def create_ticket_api(
    body: CreateTicketBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not body.asset_code.strip() or not body.fault.strip():
        raise HTTPException(status_code=400, detail="设备编号与故障描述不能为空")
    item = store.create_ticket(
        db,
        user,
        asset_code=body.asset_code,
        location=body.location,
        fault=body.fault,
        app_public_id=body.app_public_id,
    )
    return {"success": True, "ticket": item}


@router.get("/tickets/{ticket_id}")
def get_ticket_api(
    ticket_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    row = store.get_ticket(db, user.tenant_id, ticket_id)
    if not row:
        raise HTTPException(status_code=404, detail="工单不存在")
    return store.ticket_to_dict(row)


@router.post("/tickets/{ticket_id}/action")
def ticket_action_api(
    ticket_id: str,
    body: ActionBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    action = (body.action or "").strip().lower()
    if action not in ("dispatch", "complete", "next"):
        raise HTTPException(status_code=400, detail="action 须为 dispatch | complete | next")
    result = store.advance_ticket(
        db,
        user.tenant_id,
        ticket_id,
        action=action,
        comment=body.comment,
        assignee_id=body.assignee_id or None,
        assignee_name=body.assignee_name,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="工单不存在或 action 无效")
    if result.get("error") == "dispatch_requires_assignee":
        raise HTTPException(status_code=400, detail="派工请选择或填写维修工")
    if result.get("error") == "assignee_not_found":
        raise HTTPException(status_code=400, detail="维修工不在本租户或已停用")
    return {"success": True, "ticket": result}
