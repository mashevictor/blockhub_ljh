from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models import Tenant, User

DEFAULT_TENANT_SLUG = "demo"
DEFAULT_USERS = [
    {
        "email": "admin@trackchat.local",
        "password": "admin123",
        "role": "admin",
        "display_name": "系统管理员",
    },
    {
        "email": "employee@trackchat.local",
        "password": "emp123",
        "role": "employee",
        "display_name": "使用者",
    },
]


def ensure_seed_data(db: Session) -> None:
    tenant = db.query(Tenant).filter(Tenant.slug == DEFAULT_TENANT_SLUG).first()
    if not tenant:
        tenant = Tenant(
            name="TrackChat 演示租户",
            slug=DEFAULT_TENANT_SLUG,
            plan_tier="b_enterprise",
            seat_quota=100,
        )
        db.add(tenant)
        db.flush()
    else:
        # 演示租户用于冒烟/运维：避免卡在 Free 10 应用墙
        if getattr(tenant, "plan_tier", None) in (None, "", "c_free"):
            tenant.plan_tier = "b_enterprise"
            tenant.seat_quota = max(int(getattr(tenant, "seat_quota", None) or 1), 100)
            db.add(tenant)

    for item in DEFAULT_USERS:
        user = db.query(User).filter(User.email == item["email"]).first()
        if user:
            # 演示账号每次启动强制恢复密码/角色（避免 OTP 注册后 password_hash 为空）
            user.tenant_id = tenant.id
            user.password_hash = hash_password(item["password"])
            user.role = item["role"]
            user.display_name = item["display_name"]
            user.is_active = True
            continue
        db.add(
            User(
                tenant_id=tenant.id,
                email=item["email"],
                password_hash=hash_password(item["password"]),
                role=item["role"],
                display_name=item["display_name"],
            )
        )
    db.commit()

    # IM：环境变量 webhook → 自动写入 demo（及其他 IM_AUTO_TENANT_SLUGS）connector
    try:
        from app.services.im_env_bootstrap import ensure_env_im_connectors

        ensure_env_im_connectors(db)
    except Exception:  # noqa: BLE001
        pass
