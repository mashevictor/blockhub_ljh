"""sales_lead 获客字段：source/score/pool/owner_user_id/referrer。

Revision ID: 040
Revises: 039
"""

from typing import Sequence, Union

import sqlalchemy as sa
from ops_utils import add_column_if_missing, create_index_if_missing

revision: str = "040"
down_revision: Union[str, None] = "039"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    add_column_if_missing(
        "sales_lead_records",
        sa.Column("source", sa.String(length=64), nullable=False, server_default=""),
    )
    add_column_if_missing(
        "sales_lead_records",
        sa.Column("score", sa.Integer(), nullable=True),
    )
    add_column_if_missing(
        "sales_lead_records",
        sa.Column("pool_status", sa.String(length=32), nullable=False, server_default="private"),
    )
    add_column_if_missing(
        "sales_lead_records",
        sa.Column("owner_user_id", sa.String(length=36), nullable=True),
    )
    add_column_if_missing(
        "sales_lead_records",
        sa.Column("assignee_user_id", sa.String(length=36), nullable=True),
    )
    add_column_if_missing(
        "sales_lead_records",
        sa.Column("referrer", sa.String(length=200), nullable=False, server_default=""),
    )
    # category 需容纳 lead-assignment 等 method key
    try:
        from ops_utils import has_table

        if has_table("sales_lead_records"):
            from alembic import op

            op.alter_column(
                "sales_lead_records",
                "category",
                existing_type=sa.String(length=32),
                type_=sa.String(length=64),
                existing_nullable=False,
            )
    except Exception:
        pass
    create_index_if_missing(
        "ix_sales_lead_records_pool_status",
        "sales_lead_records",
        ["pool_status"],
    )
    create_index_if_missing(
        "ix_sales_lead_records_owner_user_id",
        "sales_lead_records",
        ["owner_user_id"],
    )
    create_index_if_missing(
        "ix_sales_lead_records_source",
        "sales_lead_records",
        ["source"],
    )


def downgrade() -> None:
    pass
