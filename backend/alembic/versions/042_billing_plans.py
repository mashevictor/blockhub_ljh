"""租户套餐字段 + 用量计数表。

Revision ID: 042
Revises: 041
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "042"
down_revision: Union[str, None] = "041"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = {c["name"] for c in insp.get_columns("tenants")} if insp.has_table("tenants") else set()
    if "plan_tier" not in cols:
        op.add_column(
            "tenants",
            sa.Column("plan_tier", sa.String(32), nullable=False, server_default="c_free"),
        )
    if "seat_quota" not in cols:
        op.add_column(
            "tenants",
            sa.Column("seat_quota", sa.Integer(), nullable=False, server_default="1"),
        )

    create_table_if_missing(
        "usage_meters",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("metric", sa.String(64), nullable=False),
        sa.Column("period_key", sa.String(32), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols_ix in (
        ("ix_usage_meters_tenant_id", ["tenant_id"]),
        ("ix_usage_meters_user_id", ["user_id"]),
        ("ix_usage_meters_metric", ["metric"]),
        ("ix_usage_meters_period_key", ["period_key"]),
        ("ix_usage_meters_lookup", ["tenant_id", "metric", "period_key", "user_id"]),
    ):
        create_index_if_missing(name, "usage_meters", cols_ix)


def downgrade() -> None:
    op.drop_table("usage_meters")
    op.drop_column("tenants", "seat_quota")
    op.drop_column("tenants", "plan_tier")
