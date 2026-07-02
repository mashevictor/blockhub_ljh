from __future__ import annotations

from typing import Any
from uuid import uuid4

from sqlalchemy.orm import Session

from app.db.models import AppRecord, PublishRecord, Tenant, User
from app.services.db_seed import DEFAULT_TENANT_SLUG


def _default_tenant(db: Session) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.slug == DEFAULT_TENANT_SLUG).first()
    if tenant:
        return tenant
    tenant = Tenant(name="TrackChat 演示租户", slug=DEFAULT_TENANT_SLUG)
    db.add(tenant)
    db.flush()
    return tenant


def app_record_to_dict(record: AppRecord) -> dict[str, Any]:
    return {
        "id": record.public_id,
        "name": record.name,
        "industry_key": record.industry_key,
        "scenarios": record.scenarios,
        "capability_keys": record.capability_keys,
        "modules": record.modules,
        "schema_url": record.schema_url,
        "status": record.status,
        "created_at": record.created_at.isoformat() if record.created_at else "",
        "audience": record.audience,
        "deliver": record.deliver,
        "source": record.source,
        "prompt": record.prompt,
        "contact_email": record.contact_email,
        "contact_phone": record.contact_phone,
    }


def persist_published_app(
    db: Session,
    *,
    name: str,
    industry_key: str,
    scenarios: list[str],
    audience: str,
    deliver: str,
    source: str,
    prompt: str,
    contact_email: str,
    contact_phone: str,
    capability_keys: list[str],
    modules: list[dict],
    user: User | None = None,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    tenant = user.tenant if user else _default_tenant(db)
    public_id = uuid4().hex[:8]
    record = AppRecord(
        public_id=public_id,
        tenant_id=tenant.id,
        name=name,
        industry_key=industry_key,
        scenarios=scenarios,
        capability_keys=capability_keys,
        modules=modules,
        schema_url=f"/runtime/{public_id}",
        status="published",
        audience=audience,
        deliver=deliver,
        source=source,
        prompt=prompt[:500] if prompt else "",
        contact_email=contact_email,
        contact_phone=contact_phone,
        created_by_id=user.id if user else None,
    )
    db.add(record)
    db.flush()
    db.add(
        PublishRecord(
            app_id=record.id,
            user_id=user.id if user else None,
            action="publish",
            payload=payload or {},
        )
    )
    db.commit()
    db.refresh(record)
    return app_record_to_dict(record)


def list_published_apps(db: Session, *, tenant_id: str | None = None) -> list[dict[str, Any]]:
    query = db.query(AppRecord).order_by(AppRecord.created_at.desc())
    if tenant_id:
        query = query.filter(AppRecord.tenant_id == tenant_id)
    return [app_record_to_dict(row) for row in query.all()]
