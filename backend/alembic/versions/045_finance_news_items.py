"""finance_news_items + finance_news_source_config.

Revision ID: 045
Revises: 044
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "045"
down_revision: Union[str, None] = "044"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "finance_news_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("vertical", sa.String(32), nullable=False, server_default="bank"),
        sa.Column("scope", sa.String(32), nullable=False, server_default="macro_cn"),
        sa.Column("title", sa.String(300), nullable=False, server_default=""),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("symbols", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("source", sa.String(40), nullable=False, server_default="demo"),
        sa.Column("external_id", sa.String(120), nullable=False, server_default=""),
        sa.Column("heat", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "source", "external_id", name="uq_finance_news_tenant_source_ext"),
    )
    for name, cols in (
        ("ix_finance_news_items_tenant_id", ["tenant_id"]),
        ("ix_finance_news_items_app_public_id", ["app_public_id"]),
        ("ix_finance_news_items_vertical", ["vertical"]),
        ("ix_finance_news_items_scope", ["scope"]),
        ("ix_finance_news_items_source", ["source"]),
        ("ix_finance_news_items_published_at", ["published_at"]),
    ):
        create_index_if_missing(name, "finance_news_items", cols)

    create_table_if_missing(
        "finance_news_source_config",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("provider", sa.String(40), nullable=False, server_default="public_cn"),
        sa.Column("token_enc", sa.Text(), nullable=False, server_default=""),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "provider", name="uq_finance_news_cfg_tenant_provider"),
    )
    create_index_if_missing("ix_finance_news_source_config_tenant_id", "finance_news_source_config", ["tenant_id"])


def downgrade() -> None:
    op.drop_table("finance_news_source_config")
    op.drop_table("finance_news_items")
