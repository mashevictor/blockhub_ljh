"""Audit logs for admin mutations (W5 D25).

Revision ID: 015
Revises: 014
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from ops_utils import create_index_if_missing, create_table_if_missing, drop_index_if_exists, drop_table_if_exists

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=True),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("resource", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.String(64), nullable=True),
        sa.Column("detail", sa.Text(), nullable=False, server_default=""),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    create_index_if_missing("ix_audit_logs_tenant_id", "audit_logs", ["tenant_id"])
    create_index_if_missing("ix_audit_logs_action", "audit_logs", ["action"])
    create_index_if_missing("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    drop_index_if_exists("ix_audit_logs_created_at", "audit_logs")
    drop_index_if_exists("ix_audit_logs_action", "audit_logs")
    drop_index_if_exists("ix_audit_logs_tenant_id", "audit_logs")
    drop_table_if_exists("audit_logs")
