"""Device repair ticket assignee fields (dispatch pick person).

Revision ID: 021
Revises: 020
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import add_column_if_missing, create_index_if_missing

revision: str = "021"
down_revision: Union[str, None] = "020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    add_column_if_missing(
        "device_repair_tickets",
        sa.Column("assignee_id", sa.String(length=36), nullable=True),
    )
    add_column_if_missing(
        "device_repair_tickets",
        sa.Column("assignee_name", sa.String(length=120), nullable=False, server_default=""),
    )
    create_index_if_missing(
        "ix_device_repair_tickets_assignee_id",
        "device_repair_tickets",
        ["assignee_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_device_repair_tickets_assignee_id", table_name="device_repair_tickets")
    op.drop_column("device_repair_tickets", "assignee_name")
    op.drop_column("device_repair_tickets", "assignee_id")
