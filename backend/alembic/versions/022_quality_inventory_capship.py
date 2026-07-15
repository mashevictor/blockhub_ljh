"""quality_inspect + inventory_count tables (CapShip danmaku s09/s10).

Revision ID: 022
Revises: 021
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "022"
down_revision: Union[str, None] = "021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "quality_inspect_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("product_code", sa.String(120), nullable=False),
        sa.Column("process_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("result", sa.String(32), nullable=False, server_default="pass"),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_quality_inspect_records_tenant_id", ["tenant_id"]),
        ("ix_quality_inspect_records_app_public_id", ["app_public_id"]),
        ("ix_quality_inspect_records_reporter_id", ["reporter_id"]),
        ("ix_quality_inspect_records_record_no", ["record_no"]),
        ("ix_quality_inspect_records_status", ["status"]),
    ):
        create_index_if_missing(name, "quality_inspect_records", cols)

    create_table_if_missing(
        "inventory_count_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("location", sa.String(200), nullable=False, server_default=""),
        sa.Column("sku_code", sa.String(120), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_inventory_count_records_tenant_id", ["tenant_id"]),
        ("ix_inventory_count_records_app_public_id", ["app_public_id"]),
        ("ix_inventory_count_records_reporter_id", ["reporter_id"]),
        ("ix_inventory_count_records_record_no", ["record_no"]),
        ("ix_inventory_count_records_status", ["status"]),
    ):
        create_index_if_missing(name, "inventory_count_records", cols)


def downgrade() -> None:
    op.drop_table("inventory_count_records")
    op.drop_table("quality_inspect_records")
