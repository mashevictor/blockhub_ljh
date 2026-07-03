from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.tenant_config import get_tenant_config

router = APIRouter(prefix="/tenant", tags=["tenant"])


@router.get("/config")
def tenant_config(
    db: Annotated[Session, Depends(get_db)],
    tenant: str = Query("demo", description="租户 slug"),
    app_id: str | None = Query(None, description="已发布应用 public_id，用于覆盖 app_name 等"),
) -> dict:
    """Runtime Web / Flutter 启动时拉取的租户配置（名称、主题、菜单、图标等）。"""
    return get_tenant_config(db, tenant_slug=tenant, app_public_id=app_id)
