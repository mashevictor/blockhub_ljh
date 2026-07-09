"""Integration connectors + ETL jobs tables (W4 七 Agent 集成).

Revision ID: 014
Revises: 013
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "integration_connectors",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("connector_type", sa.String(64), nullable=False, server_default="webhook"),
        sa.Column("config_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_integration_connectors_tenant_id", "integration_connectors", ["tenant_id"])
    op.create_index("ix_integration_connectors_status", "integration_connectors", ["status"])

    op.create_table(
        "etl_jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "connector_id",
            sa.String(36),
            sa.ForeignKey("integration_connectors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("trigger", sa.String(32), nullable=False, server_default="manual"),
        sa.Column("payload_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("result_json", sa.JSON(), nullable=True),
        sa.Column("ran_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_etl_jobs_connector_id", "etl_jobs", ["connector_id"])
    op.create_index("ix_etl_jobs_tenant_id", "etl_jobs", ["tenant_id"])
    op.create_index("ix_etl_jobs_status", "etl_jobs", ["status"])


def downgrade() -> None:
    op.drop_index("ix_etl_jobs_status", table_name="etl_jobs")
    op.drop_index("ix_etl_jobs_tenant_id", table_name="etl_jobs")
    op.drop_index("ix_etl_jobs_connector_id", table_name="etl_jobs")
    op.drop_table("etl_jobs")
    op.drop_index("ix_integration_connectors_status", table_name="integration_connectors")
    op.drop_index("ix_integration_connectors_tenant_id", table_name="integration_connectors")
    op.drop_table("integration_connectors")
