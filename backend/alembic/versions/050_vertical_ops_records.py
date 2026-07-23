"""vertical_ops_records: 剩余行业共享工单表

Revision ID: 050
Revises: 049
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "050"
down_revision: Union[str, None] = "049"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "vertical_ops_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("industry_key", sa.String(40), nullable=False, server_default=""),
        sa.Column("kind", sa.String(40), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("field_a", sa.String(200), nullable=False, server_default=""),
        sa.Column("field_b", sa.String(200), nullable=False, server_default=""),
        sa.Column("field_c", sa.String(200), nullable=False, server_default=""),
        sa.Column("field_d", sa.String(200), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_vertical_ops_records_tenant_id", ["tenant_id"]),
        ("ix_vertical_ops_records_app_public_id", ["app_public_id"]),
        ("ix_vertical_ops_records_reporter_id", ["reporter_id"]),
        ("ix_vertical_ops_records_record_no", ["record_no"]),
        ("ix_vertical_ops_records_industry_key", ["industry_key"]),
        ("ix_vertical_ops_records_kind", ["kind"]),
        ("ix_vertical_ops_records_status", ["status"]),
    ):
        create_index_if_missing(name, "vertical_ops_records", cols)


def downgrade() -> None:
    op.drop_table("vertical_ops_records")
