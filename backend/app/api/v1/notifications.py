from fastapi import APIRouter, HTTPException

from app.data.module_data import _notify_store

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(read: str | None = None) -> dict:
    items = _notify_store
    if read == "unread":
        items = [n for n in items if not n["read"]]
    elif read == "read":
        items = [n for n in items if n["read"]]
    unread = sum(1 for n in _notify_store if not n["read"])
    return {"total": len(items), "unread": unread, "items": items}


@router.post("/{notification_id}/read")
def mark_read(notification_id: str) -> dict:
    item = next((n for n in _notify_store if n["id"] == notification_id), None)
    if not item:
        raise HTTPException(404, "Notification not found")
    item["read"] = True
    return {"success": True, "notification": item}


@router.post("/read-all")
def mark_all_read() -> dict:
    for n in _notify_store:
        n["read"] = True
    return {"success": True, "unread": 0}
