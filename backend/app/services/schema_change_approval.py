"""page_schema 改页审批：个人草稿 → 提交 → 管理员通过后才影响正式 Runtime。"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import AppRecord, AppSchemaChangeRequest, User
from app.services.schema_versioning import _editor_name, _summarize, commit_schema_revision, schema_meta

logger = logging.getLogger(__name__)

STATUSES = frozenset({"draft", "pending", "approved", "rejected", "cancelled"})


def _row_to_dict(row: AppSchemaChangeRequest) -> dict[str, Any]:
    return {
        "id": row.id,
        "public_id": row.public_id,
        "status": row.status,
        "base_rev": int(row.base_rev or 1),
        "page_schema": row.page_schema,
        "capability_keys": list(row.capability_keys or []),
        "summary": row.summary or "",
        "author_id": row.author_id,
        "author_name": row.author_name or "",
        "reviewer_id": row.reviewer_id,
        "reviewer_name": row.reviewer_name or "",
        "review_comment": row.review_comment or "",
        "published_rev": row.published_rev,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "submitted_at": row.submitted_at.isoformat() if row.submitted_at else None,
        "reviewed_at": row.reviewed_at.isoformat() if row.reviewed_at else None,
    }


def _is_admin(user: User) -> bool:
    return (user.role or "").lower() in {"admin", "tenant_owner"}


def upsert_draft(
    db: Session,
    app: AppRecord,
    *,
    user: User,
    page_schema: dict[str, Any],
    summary: str | None = None,
    change_id: str | None = None,
) -> dict[str, Any]:
    """保存/更新当前用户的草稿（不写正式 page_schema）。每人每应用最多一个 open draft。"""
    try:
        from app.services.web_capability_gate import sanitize_page_schema

        page_schema = sanitize_page_schema(page_schema)
    except Exception:
        pass

    row: AppSchemaChangeRequest | None = None
    if change_id:
        row = (
            db.query(AppSchemaChangeRequest)
            .filter(
                AppSchemaChangeRequest.id == change_id,
                AppSchemaChangeRequest.public_id == app.public_id,
            )
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail="草稿不存在")
        if row.author_id != user.id and not _is_admin(user):
            raise HTTPException(status_code=403, detail="只能编辑自己的草稿")
        if row.status not in {"draft", "rejected"}:
            raise HTTPException(status_code=400, detail=f"状态为 {row.status}，无法再编辑为草稿")
        row.status = "draft"
    else:
        row = (
            db.query(AppSchemaChangeRequest)
            .filter(
                AppSchemaChangeRequest.public_id == app.public_id,
                AppSchemaChangeRequest.author_id == user.id,
                AppSchemaChangeRequest.status == "draft",
            )
            .order_by(AppSchemaChangeRequest.updated_at.desc())
            .first()
        )
        if not row:
            row = AppSchemaChangeRequest(
                app_id=app.id,
                public_id=app.public_id,
                status="draft",
                author_id=user.id,
                author_name=_editor_name(user),
            )
            db.add(row)

    row.base_rev = int(getattr(app, "schema_rev", None) or 1)
    row.page_schema = page_schema
    caps = page_schema.get("capability_keys") if isinstance(page_schema, dict) else None
    row.capability_keys = [str(k) for k in caps] if isinstance(caps, list) else list(app.capability_keys or [])
    row.summary = (summary or _summarize(page_schema, "draft"))[:240]
    row.author_name = _editor_name(user)
    row.review_comment = ""
    row.reviewer_id = None
    row.reviewer_name = ""
    row.published_rev = None
    row.reviewed_at = None
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return {"success": True, "change": _row_to_dict(row), **schema_meta(app)}


def submit_change(
    db: Session,
    app: AppRecord,
    *,
    user: User,
    change_id: str,
) -> dict[str, Any]:
    """草稿 → pending，并通知租户管理员。"""
    row = (
        db.query(AppSchemaChangeRequest)
        .filter(
            AppSchemaChangeRequest.id == change_id,
            AppSchemaChangeRequest.public_id == app.public_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="变更单不存在")
    if row.author_id != user.id and not _is_admin(user):
        raise HTTPException(status_code=403, detail="只能提交自己的草稿")
    if row.status not in {"draft", "rejected"}:
        raise HTTPException(status_code=400, detail=f"状态为 {row.status}，无法提交审批")
    if not row.page_schema:
        raise HTTPException(status_code=400, detail="草稿内容为空")

    row.status = "pending"
    row.base_rev = int(getattr(app, "schema_rev", None) or 1)
    row.submitted_at = datetime.now(timezone.utc)
    row.updated_at = row.submitted_at
    row.review_comment = ""
    db.commit()
    db.refresh(row)

    # Free/Plus（及遗留 Team）：无改页审批流 → 提交即自动通过写入正式版（作者可自发布）
    try:
        from app.services.plan_usage import resolve_plan_for_user

        plan = resolve_plan_for_user(db, user)
        if not plan.get("schema_approval"):
            return approve_change(
                db,
                app,
                user=user,
                change_id=change_id,
                comment="套餐无审批流，自动生效",
                allow_author_self_publish=True,
            )
    except HTTPException:
        raise
    except Exception:
        logger.exception("schema auto-approve by plan failed; keep pending")

    try:
        from app.services.notification_service import notify_tenant_admins

        notify_tenant_admins(
            db,
            tenant_id=app.tenant_id,
            title=f"改页待审批 · {app.name or app.public_id}",
            content=f"{row.author_name} 提交了页面变更（基于 v{row.base_rev}）：{row.summary}",
            type="schema_change",
            reference_id=row.id,
        )
    except Exception:
        pass

    return {"success": True, "change": _row_to_dict(row), **schema_meta(app), "requires_approval": True}


def list_changes(
    db: Session,
    app: AppRecord,
    *,
    user: User,
    status: str | None = None,
    limit: int = 30,
) -> dict[str, Any]:
    q = db.query(AppSchemaChangeRequest).filter(AppSchemaChangeRequest.public_id == app.public_id)
    if status:
        if status not in STATUSES:
            raise HTTPException(status_code=400, detail="无效 status")
        q = q.filter(AppSchemaChangeRequest.status == status)
    if not _is_admin(user):
        # 普通人：自己的全部 + 租户内 pending（只读列表，便于知道排队）
        from sqlalchemy import or_

        q = q.filter(
            or_(
                AppSchemaChangeRequest.author_id == user.id,
                AppSchemaChangeRequest.status == "pending",
            )
        )
    rows = q.order_by(AppSchemaChangeRequest.updated_at.desc()).limit(max(1, min(limit, 100))).all()
    schema_approval = False
    try:
        from app.services.plan_usage import resolve_plan_for_user

        schema_approval = bool(resolve_plan_for_user(db, user).get("schema_approval"))
    except Exception:
        schema_approval = False
    return {
        "public_id": app.public_id,
        "is_admin": _is_admin(user),
        "schema_approval": schema_approval,
        "can_direct_publish": _is_admin(user),
        "items": [_row_to_dict(r) for r in rows],
        **schema_meta(app),
    }


def approve_change(
    db: Session,
    app: AppRecord,
    *,
    user: User,
    change_id: str,
    comment: str = "",
    force: bool = False,
    allow_author_self_publish: bool = False,
) -> dict[str, Any]:
    """写入正式 page_schema + 版本历史。

    - 默认：仅 admin / tenant_owner 可审
    - allow_author_self_publish：无审批套餐「提交即生效」，作者可发布自己的单
    """
    row = (
        db.query(AppSchemaChangeRequest)
        .filter(
            AppSchemaChangeRequest.id == change_id,
            AppSchemaChangeRequest.public_id == app.public_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="变更单不存在")

    if not _is_admin(user):
        if not allow_author_self_publish or row.author_id != user.id:
            raise HTTPException(status_code=403, detail="仅管理员可审批通过")
    if row.status != "pending":
        raise HTTPException(status_code=400, detail=f"状态为 {row.status}，无法通过")
    if not isinstance(row.page_schema, dict):
        raise HTTPException(status_code=400, detail="变更内容无效")

    schema = dict(row.page_schema)
    schema["appId"] = app.public_id
    result = commit_schema_revision(
        db,
        app,
        user=user,
        page_schema=schema,
        base_rev=row.base_rev,
        source="approve" if _is_admin(user) and not allow_author_self_publish else "auto_publish",
        force=force,
    )

    row.status = "approved"
    row.reviewer_id = user.id
    row.reviewer_name = _editor_name(user)
    row.review_comment = (comment or ("套餐无审批流，自动生效" if allow_author_self_publish else "已通过"))[:500]
    row.published_rev = int(result.get("schema_rev") or app.schema_rev)
    row.reviewed_at = datetime.now(timezone.utc)
    row.updated_at = row.reviewed_at
    db.add(row)
    db.commit()
    db.refresh(row)

    if not allow_author_self_publish:
        try:
            from app.services.notification_service import create_notification

            create_notification(
                db,
                tenant_id=app.tenant_id,
                title=f"改页已通过 · {app.name or app.public_id}",
                content=f"管理员 {row.reviewer_name} 已通过你的变更，正式版本 v{row.published_rev}",
                type="schema_change",
                recipient_user_id=row.author_id,
                reference_id=row.id,
            )
        except Exception:
            pass

    return {
        "success": True,
        "change": _row_to_dict(row),
        "page_schema": result.get("page_schema"),
        "capability_keys": result.get("capability_keys"),
        "requires_approval": False,
        "auto_published": bool(allow_author_self_publish),
        **schema_meta(app),
    }


def reject_change(
    db: Session,
    app: AppRecord,
    *,
    user: User,
    change_id: str,
    comment: str = "",
) -> dict[str, Any]:
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="仅管理员可驳回")
    row = (
        db.query(AppSchemaChangeRequest)
        .filter(
            AppSchemaChangeRequest.id == change_id,
            AppSchemaChangeRequest.public_id == app.public_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="变更单不存在")
    if row.status != "pending":
        raise HTTPException(status_code=400, detail=f"状态为 {row.status}，无法驳回")

    row.status = "rejected"
    row.reviewer_id = user.id
    row.reviewer_name = _editor_name(user)
    row.review_comment = (comment or "已驳回")[:500]
    row.reviewed_at = datetime.now(timezone.utc)
    row.updated_at = row.reviewed_at
    db.commit()
    db.refresh(row)

    try:
        from app.services.notification_service import create_notification

        create_notification(
            db,
            tenant_id=app.tenant_id,
            title=f"改页已驳回 · {app.name or app.public_id}",
            content=f"管理员 {row.reviewer_name} 驳回：{row.review_comment}",
            type="schema_change",
            recipient_user_id=row.author_id,
            reference_id=row.id,
        )
    except Exception:
        pass

    return {"success": True, "change": _row_to_dict(row), **schema_meta(app)}


def get_author_open_change(
    db: Session,
    app: AppRecord,
    *,
    user: User,
) -> AppSchemaChangeRequest | None:
    """当前用户在该应用上最新的 draft/pending（用于作者单侧 Runtime）。"""
    return (
        db.query(AppSchemaChangeRequest)
        .filter(
            AppSchemaChangeRequest.public_id == app.public_id,
            AppSchemaChangeRequest.author_id == user.id,
            AppSchemaChangeRequest.status.in_(("draft", "pending")),
        )
        .order_by(AppSchemaChangeRequest.updated_at.desc())
        .first()
    )


def supersede_open_changes_after_publish(
    db: Session,
    app: AppRecord,
    *,
    user: User,
    published_rev: int,
    reason: str = "管理员已直接发布正式版",
) -> dict[str, Any]:
    """管理员直接写正式 schema 后，关闭仍 open 的 draft/pending，避免前端徽章卡在「待审批」。"""
    now = datetime.now(timezone.utc)
    rows = (
        db.query(AppSchemaChangeRequest)
        .filter(
            AppSchemaChangeRequest.public_id == app.public_id,
            AppSchemaChangeRequest.status.in_(("draft", "pending")),
        )
        .all()
    )
    if not rows:
        return {
            "closed_count": 0,
            "change_ids": [],
            "by_status": {"draft": 0, "pending": 0},
            "notifications_cleared": 0,
            "notifications_sent": 0,
        }

    reviewer = _editor_name(user)
    change_ids: list[str] = []
    by_status = {"draft": 0, "pending": 0}
    notifications_cleared = 0
    notifications_sent = 0

    for row in rows:
        prev = row.status
        if prev in by_status:
            by_status[prev] += 1
        change_ids.append(row.id)
        row.status = "cancelled"
        row.reviewer_id = user.id
        row.reviewer_name = reviewer
        row.review_comment = f"{reason}（原状态 {prev} → 已关闭）"[:500]
        row.published_rev = int(published_rev)
        row.reviewed_at = now
        row.updated_at = now
        db.add(row)
        try:
            from app.services.notification_service import create_notification
            from app.db.models import Notification

            if row.id:
                for note in (
                    db.query(Notification)
                    .filter(
                        Notification.tenant_id == app.tenant_id,
                        Notification.reference_id == row.id,
                        Notification.type == "schema_change",
                        Notification.read.is_(False),
                    )
                    .all()
                ):
                    note.read = True
                    db.add(note)
                    notifications_cleared += 1

            if row.author_id and row.author_id != user.id:
                create_notification(
                    db,
                    tenant_id=app.tenant_id,
                    title=f"改页已由管理员发布 · {app.name or app.public_id}",
                    content=f"管理员 {reviewer} 已直接发布正式 v{published_rev}，你的待审/草稿已自动关闭。",
                    type="schema_change",
                    recipient_user_id=row.author_id,
                    reference_id=row.id,
                )
                notifications_sent += 1
        except Exception:
            pass
    db.commit()

    detail = {
        "closed_count": len(rows),
        "change_ids": change_ids,
        "by_status": by_status,
        "notifications_cleared": notifications_cleared,
        "notifications_sent": notifications_sent,
    }
    logger.info(
        "schema direct publish supersede public_id=%s rev=%s closed=%s ids=%s "
        "draft=%s pending=%s notif_cleared=%s notif_sent=%s actor=%s",
        app.public_id,
        published_rev,
        detail["closed_count"],
        ",".join(change_ids),
        by_status["draft"],
        by_status["pending"],
        notifications_cleared,
        notifications_sent,
        user.id,
    )
    return detail


def cancel_change(
    db: Session,
    app: AppRecord,
    *,
    user: User,
    change_id: str,
) -> dict[str, Any]:
    row = (
        db.query(AppSchemaChangeRequest)
        .filter(
            AppSchemaChangeRequest.id == change_id,
            AppSchemaChangeRequest.public_id == app.public_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="变更单不存在")
    if row.author_id != user.id and not _is_admin(user):
        raise HTTPException(status_code=403, detail="只能取消自己的变更")
    if row.status not in {"draft", "pending", "rejected"}:
        raise HTTPException(status_code=400, detail=f"状态为 {row.status}，无法取消")
    row.status = "cancelled"
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return {"success": True, "change": _row_to_dict(row), **schema_meta(app)}
