"""meeting_booking_records + asset_manage_records.

Revision ID: 037
Revises: 036
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "037"
down_revision: Union[str, None] = "036"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table(name: str, *extra: sa.Column) -> None:
    create_table_if_missing(
        name,
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        *extra,
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    create_index_if_missing(f"ix_{name}_tenant_id", name, ["tenant_id"])
    create_index_if_missing(f"ix_{name}_app_public_id", name, ["app_public_id"])
    create_index_if_missing(f"ix_{name}_record_no", name, ["record_no"])
    create_index_if_missing(f"ix_{name}_status", name, ["status"])


def upgrade() -> None:
    _table(
        "meeting_booking_records",
        sa.Column("room_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("start_at", sa.String(64), nullable=False, server_default=""),
        sa.Column("end_at", sa.String(64), nullable=False, server_default=""),
        sa.Column("attendees", sa.String(200), nullable=False, server_default=""),
    )
    _table(
        "asset_manage_records",
        sa.Column("category", sa.String(32), nullable=False, server_default="borrow"),
        sa.Column("asset_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("asset_code", sa.String(120), nullable=False, server_default=""),
        sa.Column("quantity", sa.String(32), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_table("asset_manage_records")
    op.drop_table("meeting_booking_records")
