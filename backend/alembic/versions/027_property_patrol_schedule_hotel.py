"""property_repair + site_patrol + class_schedule + hotel_booking (CapShip s19/s28/s17/s21).

Revision ID: 027
Revises: 026
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "027"
down_revision: Union[str, None] = "026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _capship_indexes(table: str) -> None:
    for name, cols in (
        (f"ix_{table}_tenant_id", ["tenant_id"]),
        (f"ix_{table}_app_public_id", ["app_public_id"]),
        (f"ix_{table}_reporter_id", ["reporter_id"]),
        (f"ix_{table}_record_no", ["record_no"]),
        (f"ix_{table}_status", ["status"]),
    ):
        create_index_if_missing(name, table, cols)


def upgrade() -> None:
    create_table_if_missing(
        "property_repair_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("location", sa.String(200), nullable=False, server_default=""),
        sa.Column("asset_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("fault", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("property_repair_records")

    create_table_if_missing(
        "site_patrol_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("site_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("checkpoint", sa.String(120), nullable=False, server_default=""),
        sa.Column("result", sa.String(32), nullable=False, server_default="ok"),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("site_patrol_records")

    create_table_if_missing(
        "class_schedule_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("schedule_date", sa.String(10), nullable=False, server_default=""),
        sa.Column("time_slot", sa.String(64), nullable=False, server_default=""),
        sa.Column("location", sa.String(120), nullable=False, server_default=""),
        sa.Column("category", sa.String(32), nullable=False, server_default="course"),
        sa.Column("status", sa.String(32), nullable=False, server_default="published"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("class_schedule_records")

    create_table_if_missing(
        "hotel_booking_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("guest_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("room_type", sa.String(64), nullable=False, server_default=""),
        sa.Column("check_in", sa.String(10), nullable=False, server_default=""),
        sa.Column("check_out", sa.String(10), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="booked"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("hotel_booking_records")


def downgrade() -> None:
    op.drop_table("hotel_booking_records")
    op.drop_table("class_schedule_records")
    op.drop_table("site_patrol_records")
    op.drop_table("property_repair_records")
