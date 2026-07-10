"""Integration connectors + ETL jobs tables (W4 七 Agent 集成).

Revision ID: 014
Revises: 013
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from ops_utils import create_index_if_missing, create_table_if_missing, drop_index_if_exists, drop_table_if_exists

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
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
    create_index_if_missing("ix_integration_connectors_tenant_id", "integration_connectors", ["tenant_id"])
    create_index_if_missing("ix_integration_connectors_status", "integration_connectors", ["status"])

    create_table_if_missing(
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
    create_index_if_missing("ix_etl_jobs_connector_id", "etl_jobs", ["connector_id"])
    create_index_if_missing("ix_etl_jobs_tenant_id", "etl_jobs", ["tenant_id"])
    create_index_if_missing("ix_etl_jobs_status", "etl_jobs", ["status"])


def downgrade() -> None:
    drop_index_if_exists("ix_etl_jobs_status", "etl_jobs")
    drop_index_if_exists("ix_etl_jobs_tenant_id", "etl_jobs")
    drop_index_if_exists("ix_etl_jobs_connector_id", "etl_jobs")
    drop_table_if_exists("etl_jobs")
    drop_index_if_exists("ix_integration_connectors_status", "integration_connectors")
    drop_index_if_exists("ix_integration_connectors_tenant_id", "integration_connectors")
    drop_table_if_exists("integration_connectors")
