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

# 各套餐独立租户 + 所有者，便于对比「不同付费身份看到的内容」
PLAN_DEMO_TENANTS: list[dict] = [
    {
        "slug": "plan-c-free",
        "name": "套餐演示·Free",
        "plan_tier": "c_free",
        "seat_quota": 1,
        "email": "free@plan.local",
        "password": "plan123",
        "display_name": "Free 体验用户",
    },
    {
        "slug": "plan-c-plus",
        "name": "套餐演示·Plus",
        "plan_tier": "c_plus",
        "seat_quota": 1,
        "email": "plus@plan.local",
        "password": "plan123",
        "display_name": "Plus 创作者",
    },
    {
        "slug": "plan-b-team",
        "name": "套餐演示·Team",
        "plan_tier": "b_team",
        "seat_quota": 5,
        "email": "team@plan.local",
        "password": "plan123",
        "display_name": "Team 管理员",
    },
    {
        "slug": "plan-b-business",
        "name": "套餐演示·Business",
        "plan_tier": "b_business",
        "seat_quota": 10,
        "email": "business@plan.local",
        "password": "plan123",
        "display_name": "Business 管理员",
    },
    {
        "slug": "plan-b-enterprise",
        "name": "套餐演示·Enterprise",
        "plan_tier": "b_enterprise",
        "seat_quota": 50,
        "email": "enterprise@plan.local",
        "password": "plan123",
        "display_name": "Enterprise 管理员",
    },
]


def _ensure_plan_demo_tenants(db: Session) -> None:
    for item in PLAN_DEMO_TENANTS:
        tenant = db.query(Tenant).filter(Tenant.slug == item["slug"]).first()
        if not tenant:
            tenant = Tenant(
                name=item["name"],
                slug=item["slug"],
                plan_tier=item["plan_tier"],
                seat_quota=item["seat_quota"],
            )
            db.add(tenant)
            db.flush()
        else:
            tenant.name = item["name"]
            tenant.plan_tier = item["plan_tier"]
            tenant.seat_quota = item["seat_quota"]
            db.add(tenant)

        user = db.query(User).filter(User.email == item["email"]).first()
        if user:
            user.tenant_id = tenant.id
            user.password_hash = hash_password(item["password"])
            user.role = "tenant_owner"
            user.display_name = item["display_name"]
            user.is_active = True
            db.add(user)
        else:
            db.add(
                User(
                    tenant_id=tenant.id,
                    email=item["email"],
                    password_hash=hash_password(item["password"]),
                    role="tenant_owner",
                    display_name=item["display_name"],
                )
            )


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

    _ensure_plan_demo_tenants(db)
    db.commit()

    # IM：环境变量 webhook → 自动写入 demo（及其他 IM_AUTO_TENANT_SLUGS）connector
    try:
        from app.services.im_env_bootstrap import ensure_env_im_connectors

        ensure_env_im_connectors(db)
    except Exception:  # noqa: BLE001
        pass
