from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.db.models import User
from app.db.session import get_db
from app.services.approval_store import (
    action_approval,
    approval_stats,
    get_approval,
    list_approvals,
    submit_approval,
)

router = APIRouter(prefix="/approvals", tags=["approvals"])


class ActionRequest(BaseModel):
    action: str  # approve | reject
    comment: str = ""


class SubmitApprovalRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    type: str = "general"
    department: str = ""
    summary: str = ""
    payload: dict = Field(default_factory=dict)


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return approval_stats(db, user.tenant_id)


@router.get("")
def list_approvals_api(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = list_approvals(db, user.tenant_id, status=status, user=user)
    return {"total": len(items), "items": items}


@router.post("")
def submit_approval_api(
    body: SubmitApprovalRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = submit_approval(
        db,
        user,
        title=body.title,
        approval_type=body.type,
        department=body.department,
        summary=body.summary or body.title,
        payload=body.payload,
    )
    return {"success": True, "approval": item}


@router.get("/{approval_id}")
def get_approval_api(
    approval_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    record = get_approval(db, user.tenant_id, approval_id)
    if not record:
        raise HTTPException(status_code=404, detail="Approval not found")
    from app.services.approval_store import approval_to_dict

    return approval_to_dict(record)


@router.post("/{approval_id}/action")
def approval_action_api(
    approval_id: str,
    body: ActionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="仅管理员可审批")
    result = action_approval(
        db,
        user.tenant_id,
        approval_id,
        action=body.action,
        comment=body.comment,
        approver=user,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Approval not found")
    return {"success": True, "approval": result}
