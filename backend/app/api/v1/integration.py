from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import EtlJob, IntegrationConnector, User
from app.db.session import get_db

router = APIRouter(prefix="/integrations", tags=["integrations"])


class ConnectorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    connector_type: str = "webhook"
    config: dict = Field(default_factory=dict)


class ConnectorUpdate(BaseModel):
    name: str | None = None
    connector_type: str | None = None
    config: dict | None = None
    status: str | None = None


def _connector_to_dict(c: IntegrationConnector) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "connector_type": c.connector_type,
        "config": c.config_json,
        "status": c.status,
        "last_sync_at": c.last_sync_at.isoformat() if c.last_sync_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else "",
    }


@router.get("")
def list_connectors(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = (
        db.query(IntegrationConnector)
        .filter(IntegrationConnector.tenant_id == user.tenant_id)
        .order_by(IntegrationConnector.created_at.desc())
        .all()
    )
    return {"total": len(items), "items": [_connector_to_dict(c) for c in items]}


@router.post("")
def create_connector(
    body: ConnectorCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    c = IntegrationConnector(
        tenant_id=user.tenant_id,
        name=body.name.strip(),
        connector_type=body.connector_type,
        config_json=body.config or {},
        status="active",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"success": True, "connector": _connector_to_dict(c)}


@router.patch("/{connector_id}")
def update_connector(
    connector_id: str,
    body: ConnectorUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    c = (
        db.query(IntegrationConnector)
        .filter(
            IntegrationConnector.tenant_id == user.tenant_id,
            IntegrationConnector.id == connector_id,
        )
        .first()
    )
    if not c:
        raise HTTPException(404, "Connector not found")
    if body.name is not None:
        c.name = body.name.strip()
    if body.connector_type is not None:
        c.connector_type = body.connector_type
    if body.config is not None:
        c.config_json = body.config
    if body.status is not None:
        c.status = body.status
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"success": True, "connector": _connector_to_dict(c)}


@router.delete("/{connector_id}")
def delete_connector(
    connector_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    c = (
        db.query(IntegrationConnector)
        .filter(
            IntegrationConnector.tenant_id == user.tenant_id,
            IntegrationConnector.id == connector_id,
        )
        .first()
    )
    if not c:
        raise HTTPException(404, "Connector not found")
    db.delete(c)
    db.commit()
    return {"success": True}


@router.post("/{connector_id}/sync")
def run_sync(
    connector_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    c = (
        db.query(IntegrationConnector)
        .filter(
            IntegrationConnector.tenant_id == user.tenant_id,
            IntegrationConnector.id == connector_id,
        )
        .first()
    )
    if not c:
        raise HTTPException(404, "Connector not found")

    job = EtlJob(
        connector_id=c.id,
        tenant_id=user.tenant_id,
        status="running",
        trigger="manual",
        payload_json={"connector_type": c.connector_type},
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Simulate an ETL pull: mark success and record sync timestamp.
    records = max(1, len(c.config_json.get("tables", [])) if isinstance(c.config_json, dict) else 0)
    job.status = "success"
    job.ran_at = datetime.now(timezone.utc)
    job.result_json = {"records_synced": records, "finished_at": job.ran_at.isoformat()}
    c.last_sync_at = job.ran_at
    c.status = "active"
    db.add(job)
    db.add(c)
    db.commit()
    db.refresh(job)
    return {
        "success": True,
        "job": {
            "id": job.id,
            "status": job.status,
            "records_synced": job.result_json.get("records_synced"),
            "ran_at": job.ran_at.isoformat() if job.ran_at else None,
        },
    }


@router.get("/{connector_id}/jobs")
def list_jobs(
    connector_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    c = (
        db.query(IntegrationConnector)
        .filter(
            IntegrationConnector.tenant_id == user.tenant_id,
            IntegrationConnector.id == connector_id,
        )
        .first()
    )
    if not c:
        raise HTTPException(404, "Connector not found")
    jobs = (
        db.query(EtlJob)
        .filter(EtlJob.connector_id == c.id, EtlJob.tenant_id == user.tenant_id)
        .order_by(EtlJob.created_at.desc())
        .all()
    )
    return {
        "total": len(jobs),
        "items": [
            {
                "id": j.id,
                "status": j.status,
                "trigger": j.trigger,
                "result": j.result_json,
                "ran_at": j.ran_at.isoformat() if j.ran_at else None,
                "created_at": j.created_at.isoformat() if j.created_at else "",
            }
            for j in jobs
        ],
    }
