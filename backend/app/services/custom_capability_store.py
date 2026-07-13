"""Custom capability proposals and admin review."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db.models import CustomCapability, User
from app.services.effective_capability_registry import register_custom_capability


def _to_dict(row: CustomCapability) -> dict[str, Any]:
    return {
        "id": row.id,
        "key": row.key,
        "name": row.name,
        "category": row.category,
        "description": row.description,
        "keywords": row.keywords or [],
        "status": row.status,
        "proposed_by_id": row.proposed_by_id,
        "created_at": row.created_at.isoformat() if row.created_at else "",
    }


def propose_capability(
    db: Session,
    user: User,
    *,
    key: str,
    name: str,
    category: str = "自定义",
    description: str = "",
    keywords: list[str] | None = None,
) -> dict[str, Any]:
    key = key.strip().lower().replace(" ", "_")
    existing = (
        db.query(CustomCapability)
        .filter(CustomCapability.tenant_id == user.tenant_id, CustomCapability.key == key)
        .first()
    )
    if existing:
        return _to_dict(existing)
    row = CustomCapability(
        tenant_id=user.tenant_id,
        key=key,
        name=name.strip(),
        category=category.strip() or "自定义",
        description=description.strip(),
        keywords=keywords or [],
        status="pending",
        proposed_by_id=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_dict(row)


def list_custom_capabilities(
    db: Session,
    tenant_id: str,
    *,
    status: str | None = None,
) -> list[dict[str, Any]]:
    query = db.query(CustomCapability).filter(CustomCapability.tenant_id == tenant_id)
    if status:
        query = query.filter(CustomCapability.status == status)
    rows = query.order_by(CustomCapability.created_at.desc()).all()
    return [_to_dict(r) for r in rows]


def review_capability(
    db: Session,
    tenant_id: str,
    capability_id: str,
    *,
    action: str,
    reviewer: User,
) -> dict[str, Any] | None:
    row = (
        db.query(CustomCapability)
        .filter(CustomCapability.tenant_id == tenant_id, CustomCapability.id == capability_id)
        .first()
    )
    if not row:
        return None
    if action == "approve":
        row.status = "approved"
        register_custom_capability(db, row)
    elif action == "reject":
        row.status = "rejected"
    row.reviewed_by_id = reviewer.id
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_dict(row)
