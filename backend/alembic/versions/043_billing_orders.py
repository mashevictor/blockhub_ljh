"""官网套餐订单 + plan_expires_at。

Revision ID: 043
Revises: 042
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "043"
down_revision: Union[str, None] = "042"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = {c["name"] for c in insp.get_columns("tenants")} if insp.has_table("tenants") else set()
    if "plan_expires_at" not in cols:
        op.add_column(
            "tenants",
            sa.Column("plan_expires_at", sa.DateTime(timezone=True), nullable=True),
        )

    create_table_if_missing(
        "billing_orders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_tier", sa.String(32), nullable=False),
        sa.Column("seats", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("amount_fen", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(8), nullable=False, server_default="CNY"),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("provider", sa.String(32), nullable=False, server_default="yeepay"),
        sa.Column("provider_order_no", sa.String(64), nullable=False, server_default=""),
        sa.Column("pay_url", sa.String(1024), nullable=False, server_default=""),
        sa.Column("raw_notify_json", sa.JSON(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols_ix in (
        ("ix_billing_orders_tenant_id", ["tenant_id"]),
        ("ix_billing_orders_user_id", ["user_id"]),
        ("ix_billing_orders_status", ["status"]),
        ("ix_billing_orders_provider_order_no", ["provider_order_no"]),
    ):
        create_index_if_missing(name, "billing_orders", cols_ix)


def downgrade() -> None:
    op.drop_table("billing_orders")
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = {c["name"] for c in insp.get_columns("tenants")} if insp.has_table("tenants") else set()
    if "plan_expires_at" in cols:
        op.drop_column("tenants", "plan_expires_at")
