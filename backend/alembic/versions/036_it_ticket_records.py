"""it_ticket_records — CapShip office IT 报障真表.

Revision ID: 036
Revises: 035
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "036"
down_revision: Union[str, None] = "035"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "it_ticket_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ticket_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(64), nullable=False, server_default="hardware"),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("detail", sa.Text(), nullable=False, server_default=""),
        sa.Column("urgency", sa.String(32), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("assignee_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    create_index_if_missing("ix_it_ticket_records_tenant_id", "it_ticket_records", ["tenant_id"])
    create_index_if_missing("ix_it_ticket_records_app_public_id", "it_ticket_records", ["app_public_id"])
    create_index_if_missing("ix_it_ticket_records_ticket_no", "it_ticket_records", ["ticket_no"])
    create_index_if_missing("ix_it_ticket_records_status", "it_ticket_records", ["status"])


def downgrade() -> None:
    op.drop_table("it_ticket_records")
