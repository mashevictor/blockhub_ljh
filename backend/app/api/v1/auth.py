from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.db.models import User
from app.db.session import get_db
from app.services.db_seed import DEFAULT_TENANT_SLUG
from app.services.otp_service import (
    detect_account_type,
    issue_otp,
    normalize_account,
    verify_otp,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class SendCodeRequest(BaseModel):
    account: str = Field(..., min_length=3, max_length=255)


class LoginOtpRequest(BaseModel):
    account: str = Field(..., min_length=3, max_length=255)
    code: str = Field(..., min_length=4, max_length=8)


class UserOut(BaseModel):
    id: str
    email: str | None = None
    phone: str | None = None
    role: str
    display_name: str
    tenant_id: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class SendCodeResponse(BaseModel):
    success: bool = True
    message: str
    expires_in: int
    debug_code: str | None = None


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        phone=user.phone,
        role=user.role,
        display_name=user.display_name,
        tenant_id=user.tenant_id,
    )


def _default_tenant(db: Session):
    from app.db.models import Tenant

    tenant = db.query(Tenant).filter(Tenant.slug == DEFAULT_TENANT_SLUG).first()
    if tenant:
        return tenant
    tenant = Tenant(name="TrackChat 演示租户", slug=DEFAULT_TENANT_SLUG)
    db.add(tenant)
    db.flush()
    return tenant


def _find_user_by_account(db: Session, account_type: str, account: str) -> User | None:
    if account_type == "email":
        return db.query(User).filter(User.email == account).first()
    return db.query(User).filter(User.phone == account).first()


def _display_name_for(account_type: str, account: str) -> str:
    if account_type == "email":
        return account.split("@", 1)[0] or "用户"
    return f"用户{account[-4:]}"


def _find_or_create_user(db: Session, account_type: str, account: str) -> User:
    user = _find_user_by_account(db, account_type, account)
    if user:
        return user
    tenant = _default_tenant(db)
    user = User(
        tenant_id=tenant.id,
        email=account if account_type == "email" else None,
        phone=account if account_type == "phone" else None,
        password_hash=None,
        role="employee",
        display_name=_display_name_for(account_type, account),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/send-code", response_model=SendCodeResponse)
def send_code(body: SendCodeRequest) -> SendCodeResponse:
    try:
        account_type = detect_account_type(body.account)
        account = normalize_account(body.account, account_type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    try:
        code, expires_in = issue_otp(account_type, account)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc

    message = (
        f"验证码已发送至邮箱 {account}"
        if account_type == "email"
        else f"验证码已发送至手机 {account[:3]}****{account[-4:]}"
    )
    return SendCodeResponse(
        message=message,
        expires_in=expires_in,
        debug_code=code if settings.otp_debug_expose else None,
    )


@router.post("/login-otp", response_model=LoginResponse)
def login_otp(body: LoginOtpRequest, db: Annotated[Session, Depends(get_db)]) -> LoginResponse:
    try:
        account_type = detect_account_type(body.account)
        account = normalize_account(body.account, account_type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not verify_otp(account_type, account, body.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="验证码错误或已过期")

    user = _find_or_create_user(db, account_type, account)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已禁用")

    token = create_access_token(user.id, {"role": user.role, "tenant_id": user.tenant_id})
    return LoginResponse(access_token=token, user=_user_out(user))


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> LoginResponse:
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已禁用")
    token = create_access_token(user.id, {"role": user.role, "tenant_id": user.tenant_id})
    return LoginResponse(access_token=token, user=_user_out(user))


@router.post("/demo-bootstrap")
def demo_bootstrap(db: Annotated[Session, Depends(get_db)]) -> dict:
    """空库时创建演示账号（部署/冒烟用；已有用户则拒绝）。"""
    from app.services.db_seed import ensure_seed_data

    count = db.query(User).count()
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="已有用户，请直接 login 或 bash scripts/repair-auth.sh",
        )
    ensure_seed_data(db)
    return {
        "success": True,
        "message": "demo users created",
        "accounts": ["admin@trackchat.local / admin123", "employee@trackchat.local / emp123"],
    }


@router.get("/me", response_model=UserOut)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return _user_out(current_user)
