"""应用契约包下载权限：申请 → 管理员批准 → 可下载（与改页审批同款心智）。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import AppRecord, User


def _meta(app: AppRecord) -> dict[str, Any]:
    manifest = dict(app.build_manifest or {})
    meta = dict(manifest.get("meta") or {})
    return meta


def _save_meta(db: Session, app: AppRecord, meta: dict[str, Any]) -> None:
    manifest = dict(app.build_manifest or {})
    manifest["meta"] = meta
    app.build_manifest = manifest
    db.add(app)
    db.commit()
    db.refresh(app)


def can_download_code(user: User, app: AppRecord) -> bool:
    if user.role == "admin":
        return True
    if user.tenant_id != app.tenant_id:
        return False
    grants = _meta(app).get("code_download_grants") or []
    return any(str(g.get("user_id") or g) == str(user.id) for g in grants if g)


def access_status(user: User, app: AppRecord) -> dict[str, Any]:
    meta = _meta(app)
    grants = list(meta.get("code_download_grants") or [])
    requests = list(meta.get("code_download_requests") or [])
    mine = next((r for r in requests if str(r.get("user_id")) == str(user.id)), None)
    granted = can_download_code(user, app)
    out: dict[str, Any] = {
        "can_download": granted,
        "is_admin": user.role == "admin",
        "my_request": mine,
        "hint": "契约包含库表/接口说明与路径索引，不是完整 Git 仓库。",
    }
    if user.role == "admin":
        out["pending_requests"] = [r for r in requests if r.get("status") == "pending"]
        out["grants"] = grants
    return out


def request_access(db: Session, user: User, app: AppRecord) -> dict[str, Any]:
    if can_download_code(user, app):
        return access_status(user, app)
    meta = _meta(app)
    requests = list(meta.get("code_download_requests") or [])
    existing = next((r for r in requests if str(r.get("user_id")) == str(user.id)), None)
    now = datetime.now(timezone.utc).isoformat()
    if existing and existing.get("status") == "pending":
        return access_status(user, app)
    entry = {
        "user_id": user.id,
        "user_name": (user.display_name or user.email or "")[:80],
        "status": "pending",
        "requested_at": now,
    }
    requests = [r for r in requests if str(r.get("user_id")) != str(user.id)]
    requests.append(entry)
    meta["code_download_requests"] = requests[-50:]
    _save_meta(db, app, meta)
    try:
        from app.services.notification_service import notify_tenant_admins

        notify_tenant_admins(
            db,
            tenant_id=app.tenant_id,
            title="契约包下载申请",
            content=f"{entry['user_name']} 申请下载应用 {app.name}（{app.public_id}）的契约包",
            type="code_download",
            reference_id=f"code-dl-{app.public_id}-{user.id}",
        )
    except Exception:
        pass
    return access_status(user, app)


def approve_access(db: Session, admin: User, app: AppRecord, target_user_id: str) -> dict[str, Any]:
    if admin.role != "admin":
        raise PermissionError("仅管理员可批准")
    meta = _meta(app)
    requests = list(meta.get("code_download_requests") or [])
    grants = list(meta.get("code_download_grants") or [])
    now = datetime.now(timezone.utc).isoformat()
    hit = None
    for r in requests:
        if str(r.get("user_id")) == str(target_user_id):
            r["status"] = "approved"
            r["approved_at"] = now
            r["approved_by"] = admin.id
            hit = r
    if not any(str(g.get("user_id") or g) == str(target_user_id) for g in grants):
        grants.append(
            {
                "user_id": target_user_id,
                "user_name": (hit or {}).get("user_name") or target_user_id,
                "granted_at": now,
                "granted_by": admin.id,
            }
        )
    meta["code_download_requests"] = requests
    meta["code_download_grants"] = grants[-100:]
    _save_meta(db, app, meta)
    try:
        from app.services.notification_service import create_notification

        create_notification(
            db,
            tenant_id=app.tenant_id,
            recipient_user_id=target_user_id,
            title="契约包下载已批准",
            content=f"管理员已批准你下载「{app.name}」契约包",
            type="code_download",
            reference_id=f"code-dl-ok-{app.public_id}-{target_user_id}",
        )
    except Exception:
        pass
    return access_status(admin, app)
