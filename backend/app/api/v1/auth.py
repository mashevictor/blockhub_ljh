from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.db.models import User
from app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    display_name: str
    tenant_id: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        display_name=user.display_name,
        tenant_id=user.tenant_id,
    )


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> LoginResponse:
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已禁用")
    token = create_access_token(user.id, {"role": user.role, "tenant_id": user.tenant_id})
    return LoginResponse(access_token=token, user=_user_out(user))


@router.get("/me", response_model=UserOut)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return _user_out(current_user)
