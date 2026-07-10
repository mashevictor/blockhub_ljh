"""Notification table for real PG-backed notifications.

Revision ID: 013
Revises: 012
"""

import sys
from pathlib import Path
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ops_utils import create_index_if_missing, create_table_if_missing, drop_index_if_exists, drop_table_if_exists

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("recipient_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("type", sa.String(32), nullable=False, server_default="system"),
        sa.Column("reference_id", sa.String(64), nullable=True),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    create_index_if_missing("ix_notifications_tenant_id", "notifications", ["tenant_id"])
    create_index_if_missing("ix_notifications_recipient_user_id", "notifications", ["recipient_user_id"])
    create_index_if_missing("ix_notifications_reference_id", "notifications", ["reference_id"])


def downgrade() -> None:
    drop_index_if_exists("ix_notifications_reference_id", "notifications")
    drop_index_if_exists("ix_notifications_recipient_user_id", "notifications")
    drop_index_if_exists("ix_notifications_tenant_id", "notifications")
    drop_table_if_exists("notifications")
