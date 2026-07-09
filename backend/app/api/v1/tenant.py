from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.db.models import User
from app.db.session import get_db
from app.services.audit_service import write_audit_log
from app.services.tenant_config import get_tenant_config, update_tenant_config

router = APIRouter(prefix="/tenant", tags=["tenant"])


class TenantConfigUpdate(BaseModel):
    app_name: str | None = None
    app_icon_url: str | None = None
    primary_color: str | None = None
    theme: str | None = None
    menu: list[dict[str, str]] | None = None
    features: dict[str, bool] | None = None


@router.get("/config")
def tenant_config(
    db: Annotated[Session, Depends(get_db)],
    tenant: str = Query("demo", description="租户 slug"),
    app_id: str | None = Query(None, description="已发布应用 public_id，用于覆盖 app_name 等"),
) -> dict:
    """Runtime Web / Flutter 启动时拉取的租户配置（名称、主题、菜单、图标等）。"""
    return get_tenant_config(db, tenant_slug=tenant, app_public_id=app_id)


@router.put("/config")
def update_tenant_config_api(
    body: TenantConfigUpdate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_admin)],
    tenant: str = Query("demo", description="租户 slug"),
) -> dict:
    """管理员更新租户主题/菜单等运行时配置（W4 D23）。"""
    patch = body.model_dump(exclude_none=True)
    if not patch:
        return get_tenant_config(db, tenant_slug=tenant)
    result = update_tenant_config(db, tenant_slug=tenant, patch=patch)
    write_audit_log(
        db,
        tenant_id=user.tenant_id,
        user_id=user.id,
        action="update",
        resource="tenant_config",
        resource_id=tenant,
        detail=str(list(patch.keys())),
        ip_address=request.client.host if request.client else None,
    )
    return result
