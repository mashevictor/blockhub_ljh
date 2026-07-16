"""应用 page_schema 版本管理：乐观锁写回 + 修订历史 + 回滚。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import AppRecord, AppSchemaRevision, User


def schema_meta(app: AppRecord) -> dict[str, Any]:
    return {
        "schema_rev": int(getattr(app, "schema_rev", None) or 1),
        "schema_updated_at": app.schema_updated_at.isoformat() if app.schema_updated_at else None,
        "schema_editor_name": app.schema_editor_name or "",
        "schema_updated_by_id": app.schema_updated_by_id,
    }


def _editor_name(user: User) -> str:
    return (user.display_name or user.email or user.phone or "用户").strip()[:120]


def _summarize(schema: dict[str, Any], source: str) -> str:
    menu = schema.get("menu") if isinstance(schema.get("menu"), list) else []
    labels = [str(m.get("label") or m.get("key") or "") for m in menu if isinstance(m, dict)]
    labels = [x for x in labels if x][:6]
    head = "、".join(labels) if labels else "空菜单"
    return f"{source} · {len(labels)}项 · {head}"[:240]


def commit_schema_revision(
    db: Session,
    app: AppRecord,
    *,
    user: User,
    page_schema: dict[str, Any],
    base_rev: int | None,
    source: str = "compose",
    force: bool = False,
) -> dict[str, Any]:
    """写回 schema 并递增版本。base_rev 与当前不一致且未 force → 409。"""
    current = int(getattr(app, "schema_rev", None) or 1)
    if base_rev is not None and not force and int(base_rev) != current:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "SCHEMA_REV_CONFLICT",
                "message": (
                    f"页面已被其他人更新（当前 v{current}，你基于 v{base_rev}）。"
                    "请拉取最新后再改，或强制覆盖。"
                ),
                "schema_rev": current,
                "schema_editor_name": app.schema_editor_name or "",
                "page_schema": app.page_schema,
            },
        )

    next_rev = current + 1
    app.page_schema = page_schema
    if isinstance(page_schema.get("capability_keys"), list):
        app.capability_keys = [str(k) for k in page_schema["capability_keys"] if k]
    app.schema_rev = next_rev
    app.schema_updated_at = datetime.now(timezone.utc)
    app.schema_updated_by_id = user.id
    app.schema_editor_name = _editor_name(user)

    row = AppSchemaRevision(
        app_id=app.id,
        public_id=app.public_id,
        rev=next_rev,
        page_schema=page_schema,
        capability_keys=list(app.capability_keys or []),
        summary=_summarize(page_schema, source),
        source=source[:32],
        editor_id=user.id,
        editor_name=app.schema_editor_name,
    )
    db.add(app)
    db.add(row)
    db.commit()
    db.refresh(app)
    return {
        "success": True,
        "public_id": app.public_id,
        "page_schema": app.page_schema,
        "capability_keys": app.capability_keys,
        **schema_meta(app),
    }


def list_revisions(db: Session, public_id: str, *, limit: int = 30) -> list[dict[str, Any]]:
    rows = (
        db.query(AppSchemaRevision)
        .filter(AppSchemaRevision.public_id == public_id)
        .order_by(AppSchemaRevision.rev.desc())
        .limit(max(1, min(limit, 100)))
        .all()
    )
    return [
        {
            "rev": r.rev,
            "summary": r.summary,
            "source": r.source,
            "editor_name": r.editor_name,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


def restore_revision(
    db: Session,
    app: AppRecord,
    *,
    user: User,
    rev: int,
    base_rev: int | None,
    force: bool = False,
) -> dict[str, Any]:
    snap = (
        db.query(AppSchemaRevision)
        .filter(AppSchemaRevision.public_id == app.public_id, AppSchemaRevision.rev == rev)
        .first()
    )
    if not snap or not snap.page_schema:
        raise HTTPException(status_code=404, detail=f"找不到版本 v{rev}")
    schema = dict(snap.page_schema)
    schema["appId"] = app.public_id
    return commit_schema_revision(
        db,
        app,
        user=user,
        page_schema=schema,
        base_rev=base_rev,
        source=f"restore:v{rev}",
        force=force,
    )
