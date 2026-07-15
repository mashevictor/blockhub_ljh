"""batch CapShip: delivery/house/campaign/fitness/travel (s22/s20/s18/s23/s24).

Revision ID: 030
Revises: 029
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "030"
down_revision: Union[str, None] = "029"
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
        "delivery_order_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("pickup", sa.String(200), nullable=False, server_default=""),
        sa.Column("dropoff", sa.String(200), nullable=False, server_default=""),
        sa.Column("rider_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("delivery_order_records")

    create_table_if_missing(
        "house_viewing_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("client_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("property_addr", sa.String(200), nullable=False, server_default=""),
        sa.Column("schedule_at", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("house_viewing_records")

    create_table_if_missing(
        "campaign_ops_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("channel", sa.String(120), nullable=False, server_default=""),
        sa.Column("metric", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("campaign_ops_records")

    create_table_if_missing(
        "fitness_checkin_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("member_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("class_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("schedule_at", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("fitness_checkin_records")

    create_table_if_missing(
        "travel_plan_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("destination", sa.String(200), nullable=False, server_default=""),
        sa.Column("days", sa.String(64), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("travel_plan_records")


def downgrade() -> None:
    op.drop_table("travel_plan_records")
    op.drop_table("fitness_checkin_records")
    op.drop_table("campaign_ops_records")
    op.drop_table("house_viewing_records")
    op.drop_table("delivery_order_records")
