"""系统集成 API — P4-I1/I2：Adapter sync + CRM ingress + IM 探测。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import EtlJob, IntegrationConnector, IntegrationEvent, User
from app.db.session import get_db
from app.services.connectors import resolve_adapter
from app.services.connectors.adapters.crm_webhook import CrmWebhookAdapter
from app.services.im_delivery_service import deliver_im_message

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


class TestMessageBody(BaseModel):
    title: str = "积木仓集成探测"
    content: str = "这是一条来自 BlockHub 的测试消息（P4-I2）。点下方链接可打开应用。"
    detail_url: str = ""
    app_public_id: str = ""
    link_label: str = "打开应用查看"


def _connector_to_dict(c: IntegrationConnector) -> dict:
    cfg = c.config_json if isinstance(c.config_json, dict) else {}
    return {
        "id": c.id,
        "name": c.name,
        "connector_type": c.connector_type,
        "config": cfg,
        "vendor": cfg.get("vendor") or c.connector_type,
        "status": c.status,
        "last_sync_at": c.last_sync_at.isoformat() if c.last_sync_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else "",
    }


def _get_tenant_connector(db: Session, tenant_id: str, connector_id: str) -> IntegrationConnector:
    c = (
        db.query(IntegrationConnector)
        .filter(
            IntegrationConnector.tenant_id == tenant_id,
            IntegrationConnector.id == connector_id,
        )
        .first()
    )
    if not c:
        raise HTTPException(404, "Connector not found")
    return c


@router.post("/ingress/webhook")
async def ingress_webhook(
    request: Request,
    connector_id: str = Query(..., description="目标连接器 ID"),
    ingress_token: str | None = Query(None, description="可选：config.ingress_token"),
    db: Session = Depends(get_db),
    x_blockhub_signature: Annotated[str | None, Header()] = None,
    x_hub_signature_256: Annotated[str | None, Header()] = None,
) -> dict:
    """
    公开入站（CRM/自建系统）：HMAC 验签后写入 integration_events。
    签名头：X-BlockHub-Signature 或 X-Hub-Signature-256（sha256=<hex>）。
    """
    c = db.query(IntegrationConnector).filter(IntegrationConnector.id == connector_id).first()
    if not c or c.status != "active":
        raise HTTPException(404, "Connector not found or inactive")
    cfg = c.config_json if isinstance(c.config_json, dict) else {}
    expected_token = str(cfg.get("ingress_token") or "")
    if expected_token and ingress_token != expected_token:
        raise HTTPException(401, "invalid ingress_token")

    body = await request.body()
    signature = x_blockhub_signature or x_hub_signature_256
    adapter = resolve_adapter(c.connector_type, cfg)
    if not isinstance(adapter, CrmWebhookAdapter):
        adapter = CrmWebhookAdapter(cfg)

    result = adapter.ingest_raw(
        body=body,
        signature=signature,
        context={
            "db": db,
            "tenant_id": c.tenant_id,
            "connector_id": c.id,
            "connector": c,
        },
    )
    if result.errors and "invalid_hmac_signature" in result.errors:
        raise HTTPException(401, "invalid signature")
    if result.errors and not result.records_synced:
        raise HTTPException(400, {"errors": result.errors})

    job = EtlJob(
        connector_id=c.id,
        tenant_id=c.tenant_id,
        status="success" if result.ok else "failed",
        trigger="ingress",
        payload_json={"path": "ingress/webhook"},
        result_json={
            "records_synced": result.records_synced,
            "errors": result.errors,
            "details": result.details,
        },
        ran_at=datetime.now(timezone.utc),
    )
    c.last_sync_at = job.ran_at
    db.add(job)
    db.add(c)
    db.commit()
    return {
        "success": True,
        "records_synced": result.records_synced,
        "errors": result.errors,
        "job_id": job.id,
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
    cfg = dict(body.config or {})
    if "vendor" not in cfg:
        cfg["vendor"] = body.connector_type
    if "field_map" not in cfg:
        cfg["field_map"] = {}
    c = IntegrationConnector(
        tenant_id=user.tenant_id,
        name=body.name.strip(),
        connector_type=body.connector_type,
        config_json=cfg,
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
    c = _get_tenant_connector(db, user.tenant_id, connector_id)
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
    c = _get_tenant_connector(db, user.tenant_id, connector_id)
    db.delete(c)
    db.commit()
    return {"success": True}


@router.post("/{connector_id}/sync")
def run_sync(
    connector_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    c = _get_tenant_connector(db, user.tenant_id, connector_id)
    job = EtlJob(
        connector_id=c.id,
        tenant_id=user.tenant_id,
        status="running",
        trigger="manual",
        payload_json={"connector_type": c.connector_type, "vendor": (c.config_json or {}).get("vendor")},
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    adapter = resolve_adapter(c.connector_type, c.config_json if isinstance(c.config_json, dict) else {})
    result = adapter.run_sync(
        context={
            "db": db,
            "tenant_id": user.tenant_id,
            "connector_id": c.id,
            "connector": c,
        }
    )
    now = datetime.now(timezone.utc)
    job.ran_at = now
    job.status = "success" if result.ok else "failed"
    job.result_json = {
        "records_synced": result.records_synced,
        "errors": result.errors,
        "details": result.details,
        "finished_at": now.isoformat(),
        "adapter": adapter.__class__.__name__,
    }
    c.last_sync_at = now
    if result.ok:
        c.status = "active"
    db.add(job)
    db.add(c)
    db.commit()
    db.refresh(job)
    return {
        "success": result.ok,
        "job": {
            "id": job.id,
            "status": job.status,
            "records_synced": result.records_synced,
            "errors": result.errors,
            "result": job.result_json,
            "ran_at": job.ran_at.isoformat() if job.ran_at else None,
        },
    }


@router.post("/{connector_id}/test-message")
def test_im_message(
    connector_id: str,
    body: TestMessageBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    from app.services.im_delivery_service import runtime_detail_url

    _get_tenant_connector(db, user.tenant_id, connector_id)
    detail = (body.detail_url or "").strip() or runtime_detail_url(
        body.app_public_id,
        path="/device-repair",
    )
    out = deliver_im_message(
        db,
        tenant_id=user.tenant_id,
        title=body.title,
        content=body.content,
        connector_id=connector_id,
        detail_url=detail,
        link_label=body.link_label or "打开应用查看",
    )
    return {"success": out.get("status") in ("success", "partial"), **out}


@router.get("/{connector_id}/events")
def list_events(
    connector_id: str,
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _get_tenant_connector(db, user.tenant_id, connector_id)
    q = db.query(IntegrationEvent).filter(
        IntegrationEvent.tenant_id == user.tenant_id,
        IntegrationEvent.connector_id == connector_id,
    )
    if status:
        q = q.filter(IntegrationEvent.status == status)
    rows = q.order_by(IntegrationEvent.created_at.desc()).limit(100).all()
    return {
        "total": len(rows),
        "items": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "external_id": e.external_id,
                "status": e.status,
                "payload": e.payload_json,
                "created_at": e.created_at.isoformat() if e.created_at else "",
            }
            for e in rows
        ],
    }


@router.get("/{connector_id}/jobs")
def list_jobs(
    connector_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    c = _get_tenant_connector(db, user.tenant_id, connector_id)
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

