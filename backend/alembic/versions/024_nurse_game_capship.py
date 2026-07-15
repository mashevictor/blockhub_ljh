"""nurse_shift + game_support tables (CapShip danmaku s13/s14).

Revision ID: 024
Revises: 023
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "024"
down_revision: Union[str, None] = "023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "nurse_shift_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("nurse_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("shift_date", sa.String(32), nullable=False, server_default=""),
        sa.Column("from_shift", sa.String(64), nullable=False, server_default=""),
        sa.Column("to_shift", sa.String(64), nullable=False, server_default=""),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_nurse_shift_records_tenant_id", ["tenant_id"]),
        ("ix_nurse_shift_records_app_public_id", ["app_public_id"]),
        ("ix_nurse_shift_records_reporter_id", ["reporter_id"]),
        ("ix_nurse_shift_records_record_no", ["record_no"]),
        ("ix_nurse_shift_records_status", ["status"]),
    ):
        create_index_if_missing(name, "nurse_shift_records", cols)

    create_table_if_missing(
        "game_support_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default="ticket"),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("player_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_game_support_records_tenant_id", ["tenant_id"]),
        ("ix_game_support_records_app_public_id", ["app_public_id"]),
        ("ix_game_support_records_reporter_id", ["reporter_id"]),
        ("ix_game_support_records_record_no", ["record_no"]),
        ("ix_game_support_records_status", ["status"]),
    ):
        create_index_if_missing(name, "game_support_records", cols)


def downgrade() -> None:
    op.drop_table("game_support_records")
    op.drop_table("nurse_shift_records")
