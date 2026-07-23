"""CapShip · 金融行业新闻 Agent API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import finance_news_store as store
from app.services.finance_news_adapters import PROVIDERS, VERTICALS

router = APIRouter(prefix="/finance-news", tags=["finance-news"])


class DemoSeedBody(BaseModel):
    vertical: str = Field(default="bank", max_length=32)
    app_public_id: str = Field(default="", max_length=64)
    refresh: bool = False


class SourceConfigBody(BaseModel):
    provider: str = Field(default="public_cn", max_length=40)
    token: str = Field(default="", max_length=200)
    enabled: bool = True


class SyncBody(BaseModel):
    provider: str = Field(default="public_cn", max_length=40)
    vertical: str = Field(default="bank", max_length=32)
    app_public_id: str = Field(default="", max_length=64)
    limit: int = Field(default=30, ge=1, le=50)


class BriefBody(BaseModel):
    vertical: str = Field(default="bank", max_length=32)
    kind: str = Field(default="industry", max_length=32)  # industry | company | macro
    scope: str | None = Field(default=None, max_length=32)


@router.get("/items")
def list_items(
    vertical: str | None = Query(None),
    scope: str | None = Query(None),
    app_id: str | None = Query(None),
    source: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_items(
        db,
        user.tenant_id,
        vertical=vertical,
        scope=scope,
        app_public_id=app_id or None,
        source=source,
    )
    return {"total": len(items), "items": items}


@router.get("/source-config")
def get_source_config(
    provider: str = Query("public_cn"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cfg = store.get_source_config(db, user.tenant_id, provider)
    return {"config": cfg}


@router.post("/demo-seed")
def demo_seed(
    body: DemoSeedBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    v = body.vertical if body.vertical in VERTICALS else "bank"
    try:
        return store.demo_seed(
            db, user, vertical=v, app_public_id=body.app_public_id, refresh=body.refresh
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.post("/source-config")
def save_source_config(
    body: SourceConfigBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        cfg = store.upsert_source_config(
            db, user, provider=body.provider, token=body.token, enabled=body.enabled
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"success": True, "config": cfg}


@router.post("/sync")
def sync_news(
    body: SyncBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if body.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"不支持的源: {body.provider}")
    v = body.vertical if body.vertical in VERTICALS else "bank"
    try:
        return store.sync_news(
            db,
            user,
            provider=body.provider,
            vertical=v,
            app_public_id=body.app_public_id,
            limit=body.limit,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/brief")
def brief(
    body: BriefBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    v = body.vertical if body.vertical in VERTICALS else "bank"
    kind = body.kind if body.kind in ("industry", "company", "macro") else "industry"
    try:
        return store.generate_brief(db, user.tenant_id, vertical=v, kind=kind, scope=body.scope)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
