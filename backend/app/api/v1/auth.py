from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.db.models import User
from app.db.session import get_db
from app.services.captcha_service import captcha_configured, verify_captcha_ticket
from app.services.db_seed import DEFAULT_TENANT_SLUG
from app.services.email_service import send_email, smtp_configured
from app.services.otp_service import (
    detect_account_type,
    issue_otp,
    normalize_account,
    verify_otp,
)
from app.services.sms_service import send_otp_sms, sms_configured
from app.services import wecom_oauth

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class SendCodeRequest(BaseModel):
    account: str = Field(..., min_length=3, max_length=255)
    # 腾讯云验证码票据（Captcha 已配置时必填）
    ticket: str | None = None
    randstr: str | None = None


class CaptchaConfigResponse(BaseModel):
    enabled: bool
    app_id: str = ""


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
    tenant = Tenant(name="TrackChat 演示租户", slug=DEFAULT_TENANT_SLUG, plan_tier="b_enterprise", seat_quota=100)
    db.add(tenant)
    db.flush()
    return tenant


def _create_personal_tenant(db: Session, display_name: str):
    """OTP/企微新用户：独立租户，默认 Free。"""
    from uuid import uuid4

    from app.db.models import Tenant

    slug = f"u_{uuid4().hex[:12]}"
    tenant = Tenant(
        name=f"{display_name or '用户'}的空间",
        slug=slug,
        plan_tier="c_free",
        seat_quota=1,
    )
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
    display = _display_name_for(account_type, account)
    tenant = _create_personal_tenant(db, display)
    user = User(
        tenant_id=tenant.id,
        email=account if account_type == "email" else None,
        phone=account if account_type == "phone" else None,
        password_hash=None,
        role="tenant_owner",
        display_name=display,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _client_ip(request: Request) -> str:
    forwarded = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    if forwarded:
        return forwarded
    real = (request.headers.get("x-real-ip") or "").strip()
    if real:
        return real
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


@router.get("/captcha-config", response_model=CaptchaConfigResponse)
def captcha_config() -> CaptchaConfigResponse:
    enabled = captcha_configured()
    return CaptchaConfigResponse(
        enabled=enabled,
        app_id=str(settings.tencent_captcha_app_id).strip() if enabled else "",
    )


@router.post("/send-code", response_model=SendCodeResponse)
def send_code(body: SendCodeRequest, request: Request) -> SendCodeResponse:
    try:
        account_type = detect_account_type(body.account)
        account = normalize_account(body.account, account_type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if captcha_configured():
        try:
            verify_captcha_ticket(
                ticket=body.ticket or "",
                randstr=body.randstr or "",
                user_ip=_client_ip(request),
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if account_type == "phone" and not sms_configured() and not settings.otp_debug_expose:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="短信服务未配置，请联系管理员（需 TENCENT_SMS_*）",
        )
    if account_type == "email" and not smtp_configured() and not settings.otp_debug_expose:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="邮件服务未配置，请联系管理员",
        )

    try:
        code, expires_in = issue_otp(account_type, account)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc

    if account_type == "phone":
        if sms_configured() and not send_otp_sms(account, code):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="短信发送失败，请稍后重试",
            )
        message = f"验证码已发送至手机 {account[:3]}****{account[-4:]}"
    else:
        if smtp_configured():
            ok = send_email(
                to=account,
                subject=f"{settings.smtp_from_name} 登录验证码",
                text=f"您的验证码是 {code}，{expires_in // 60} 分钟内有效。如非本人操作请忽略。",
                html=(
                    f"<p>您的验证码是 <strong>{code}</strong>，"
                    f"{expires_in // 60} 分钟内有效。</p><p>如非本人操作请忽略。</p>"
                ),
            )
            if not ok:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="邮件发送失败，请稍后重试",
                )
        message = f"验证码已发送至邮箱 {account}"

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
    }


@router.get("/me", response_model=UserOut)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return _user_out(current_user)


@router.get("/oauth/wecom/start", response_model=None)
def wecom_oauth_start(state: str = Query("blockhub")) -> dict:
    """企微 OAuth 入口。未配置凭证时 503；配置后返回 authorize_url（前端可跳转）。"""
    if not wecom_oauth.wecom_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "企业微信 SSO 未配置。请在环境变量设置 WECOM_CORP_ID / WECOM_AGENT_ID / WECOM_SECRET"
                "（可选 WECOM_OAUTH_REDIRECT_URI）。详见 docs/项目计划-合成版v1.3.md §8 P4-I2。"
            ),
        )
    url = wecom_oauth.build_authorize_url(state=state or "blockhub")
    return {"authorize_url": url, "redirect_uri": wecom_oauth.redirect_uri(), "provider": "wecom"}


@router.get("/oauth/wecom/callback", response_model=None)
def wecom_oauth_callback(
    db: Annotated[Session, Depends(get_db)],
    code: str | None = Query(None),
    state: str = Query("blockhub"),
) -> RedirectResponse:
    """企微回调 → 换 userid → 签发 JWT → 重定向到前端带 token。"""
    if not wecom_oauth.wecom_configured():
        raise HTTPException(status_code=503, detail="企业微信 SSO 未配置")
    if not code:
        raise HTTPException(status_code=400, detail="缺少 code")
    try:
        info = wecom_oauth.exchange_code_for_userid(code)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    userid = info["userid"]
    # 用稳定伪邮箱关联用户，避免与普通邮箱登录冲突
    email = f"wecom_{userid}@wecom.local"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        display = f"企微用户{userid[-4:] if len(userid) >= 4 else userid}"
        tenant = _create_personal_tenant(db, display)
        user = User(
            tenant_id=tenant.id,
            email=email,
            phone=None,
            password_hash=None,
            role="tenant_owner",
            display_name=display,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已禁用")

    token = create_access_token(user.id, {"role": user.role, "tenant_id": user.tenant_id, "sso": "wecom"})
    front = settings.public_base_url.rstrip("/")
    # 运行时或首页可读取 hash 中的 token
    target = f"{front}/r/sso-callback#access_token={quote(token)}&state={quote(state)}"
    return RedirectResponse(url=target, status_code=302)
