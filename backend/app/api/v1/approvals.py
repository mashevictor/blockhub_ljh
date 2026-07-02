from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.data.module_data import _approval_store, approval_stats

router = APIRouter(prefix="/approvals", tags=["approvals"])


class ActionRequest(BaseModel):
    action: str  # approve | reject
    comment: str = ""


@router.get("/stats")
def get_stats() -> dict:
    return approval_stats()


@router.get("")
def list_approvals(status: str | None = None) -> dict:
    items = _approval_store
    if status and status != "all":
        items = [a for a in items if a["status"] == status]
    return {"total": len(items), "items": items}


@router.get("/{approval_id}")
def get_approval(approval_id: str) -> dict:
    item = next((a for a in _approval_store if a["id"] == approval_id), None)
    if not item:
        raise HTTPException(404, "Approval not found")
    return item


@router.post("/{approval_id}/action")
def approval_action(approval_id: str, body: ActionRequest) -> dict:
    item = next((a for a in _approval_store if a["id"] == approval_id), None)
    if not item:
        raise HTTPException(404, "Approval not found")
    if body.action == "approve":
        item["status"] = "approved"
    elif body.action == "reject":
        item["status"] = "rejected"
    item["comment"] = body.comment
    return {"success": True, "approval": item}
