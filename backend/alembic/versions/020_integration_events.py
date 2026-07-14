"""Integration events for CRM webhook ingress (P4-I1).

Revision ID: 020
Revises: 019
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "020"
down_revision: Union[str, None] = "019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "integration_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("connector_id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False, server_default="crm.upsert"),
        sa.Column("external_id", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["connector_id"], ["integration_connectors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_integration_events_tenant_id", "integration_events", ["tenant_id"])
    op.create_index("ix_integration_events_connector_id", "integration_events", ["connector_id"])
    op.create_index("ix_integration_events_event_type", "integration_events", ["event_type"])
    op.create_index("ix_integration_events_external_id", "integration_events", ["external_id"])
    op.create_index("ix_integration_events_status", "integration_events", ["status"])


def downgrade() -> None:
    op.drop_index("ix_integration_events_status", table_name="integration_events")
    op.drop_index("ix_integration_events_external_id", table_name="integration_events")
    op.drop_index("ix_integration_events_event_type", table_name="integration_events")
    op.drop_index("ix_integration_events_connector_id", table_name="integration_events")
    op.drop_index("ix_integration_events_tenant_id", table_name="integration_events")
    op.drop_table("integration_events")
