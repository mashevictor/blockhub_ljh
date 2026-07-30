from typing import Annotated

from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.api_error import raise_api_error
from app.core.security import decode_access_token
from app.db.models import User
from app.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise_api_error(status.HTTP_401_UNAUTHORIZED, "UNAUTHORIZED")
    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise_api_error(status.HTTP_401_UNAUTHORIZED, "TOKEN_INVALID")
    user = db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise_api_error(status.HTTP_401_UNAUTHORIZED, "ACCOUNT_DISABLED")
    return user


def get_optional_user(
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        return None
    user = db.get(User, payload["sub"])
    if not user or not user.is_active:
        return None
    return user


def require_roles(*roles: str):
    """RBAC：仅允许指定角色（如 admin / employee / tenant_owner）。"""

    def _dep(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise_api_error(status.HTTP_403_FORBIDDEN, "FORBIDDEN")
        return user

    return _dep


def is_tenant_admin(user: User) -> bool:
    """本租户管理：平台 admin 或个人空间 tenant_owner。"""
    return (user.role or "") in {"admin", "tenant_owner"}


def is_platform_admin(user: User) -> bool:
    """跨租户平台特权（演示租户运维账号）。"""
    return (user.role or "") == "admin"


# 本租户管理写操作（创建应用 / 知识库写 / 租户配置等）
require_admin = require_roles("admin", "tenant_owner")
# 仅平台运维（seed 等）
require_platform_admin = require_roles("admin")
# 官网升级套餐付款人：租户所有者或平台管理员
require_billing_payer = require_roles("admin", "tenant_owner")
