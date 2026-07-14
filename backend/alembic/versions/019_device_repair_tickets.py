"""Device repair tickets for CapShip device_repair capability.

Revision ID: 019
Revises: 018
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "019"
down_revision: Union[str, None] = "018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "device_repair_tickets",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("app_public_id", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(length=36), nullable=False),
        sa.Column("ticket_no", sa.String(length=32), nullable=False),
        sa.Column("asset_code", sa.String(length=120), nullable=False),
        sa.Column("location", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("fault", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("comment", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_device_repair_tickets_tenant_id", "device_repair_tickets", ["tenant_id"])
    op.create_index("ix_device_repair_tickets_app_public_id", "device_repair_tickets", ["app_public_id"])
    op.create_index("ix_device_repair_tickets_reporter_id", "device_repair_tickets", ["reporter_id"])
    op.create_index("ix_device_repair_tickets_ticket_no", "device_repair_tickets", ["ticket_no"])
    op.create_index("ix_device_repair_tickets_status", "device_repair_tickets", ["status"])


def downgrade() -> None:
    op.drop_index("ix_device_repair_tickets_status", table_name="device_repair_tickets")
    op.drop_index("ix_device_repair_tickets_ticket_no", table_name="device_repair_tickets")
    op.drop_index("ix_device_repair_tickets_reporter_id", table_name="device_repair_tickets")
    op.drop_index("ix_device_repair_tickets_app_public_id", table_name="device_repair_tickets")
    op.drop_index("ix_device_repair_tickets_tenant_id", table_name="device_repair_tickets")
    op.drop_table("device_repair_tickets")
