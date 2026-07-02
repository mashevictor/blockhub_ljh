"""user phone and nullable credentials for OTP login

Revision ID: 002
Revises: 001
Create Date: 2026-07-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=20), nullable=True))
    op.create_index(op.f("ix_users_phone"), "users", ["phone"], unique=True)
    op.alter_column("users", "email", existing_type=sa.String(length=255), nullable=True)
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=False)
    op.alter_column("users", "email", existing_type=sa.String(length=255), nullable=False)
    op.drop_index(op.f("ix_users_phone"), table_name="users")
    op.drop_column("users", "phone")
