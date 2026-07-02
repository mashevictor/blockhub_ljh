"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-07-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tenants_slug"), "tenants", ["slug"], unique=True)

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_tenant_id"), "users", ["tenant_id"], unique=False)

    op.create_table(
        "apps",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("public_id", sa.String(length=16), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("industry_key", sa.String(length=64), nullable=False),
        sa.Column("scenarios", sa.JSON(), nullable=False),
        sa.Column("capability_keys", sa.JSON(), nullable=False),
        sa.Column("modules", sa.JSON(), nullable=False),
        sa.Column("schema_url", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("audience", sa.String(length=32), nullable=False),
        sa.Column("deliver", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("contact_email", sa.String(length=255), nullable=False),
        sa.Column("contact_phone", sa.String(length=64), nullable=False),
        sa.Column("created_by_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_apps_public_id"), "apps", ["public_id"], unique=True)
    op.create_index(op.f("ix_apps_tenant_id"), "apps", ["tenant_id"], unique=False)

    op.create_table(
        "publish_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("app_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["app_id"], ["apps.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_publish_records_app_id"), "publish_records", ["app_id"], unique=False)
    op.create_index(op.f("ix_publish_records_user_id"), "publish_records", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_publish_records_user_id"), table_name="publish_records")
    op.drop_index(op.f("ix_publish_records_app_id"), table_name="publish_records")
    op.drop_table("publish_records")
    op.drop_index(op.f("ix_apps_tenant_id"), table_name="apps")
    op.drop_index(op.f("ix_apps_public_id"), table_name="apps")
    op.drop_table("apps")
    op.drop_index(op.f("ix_users_tenant_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    op.drop_index(op.f("ix_tenants_slug"), table_name="tenants")
    op.drop_table("tenants")
