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
        "display_name": "普通员工",
    },
]


def ensure_seed_data(db: Session) -> None:
    tenant = db.query(Tenant).filter(Tenant.slug == DEFAULT_TENANT_SLUG).first()
    if not tenant:
        tenant = Tenant(name="TrackChat 演示租户", slug=DEFAULT_TENANT_SLUG)
        db.add(tenant)
        db.flush()

    for item in DEFAULT_USERS:
        exists = db.query(User).filter(User.email == item["email"]).first()
        if exists:
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
