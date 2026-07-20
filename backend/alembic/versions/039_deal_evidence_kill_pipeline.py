"""deal_evidence + kill_pipeline — 销售突破能力真表。

Revision ID: 039
Revises: 038
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "039"
down_revision: Union[str, None] = "038"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "deal_evidence_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("lead_id", sa.String(36), nullable=False, server_default=""),
        sa.Column("customer", sa.String(200), nullable=False, server_default=""),
        sa.Column("evidence_type", sa.String(64), nullable=False, server_default="other"),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("target_stage", sa.String(32), nullable=False, server_default="following"),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    create_index_if_missing("ix_deal_evidence_records_tenant_id", "deal_evidence_records", ["tenant_id"])
    create_index_if_missing("ix_deal_evidence_records_app_public_id", "deal_evidence_records", ["app_public_id"])
    create_index_if_missing("ix_deal_evidence_records_record_no", "deal_evidence_records", ["record_no"])
    create_index_if_missing("ix_deal_evidence_records_lead_id", "deal_evidence_records", ["lead_id"])
    create_index_if_missing("ix_deal_evidence_records_status", "deal_evidence_records", ["status"])

    create_table_if_missing(
        "kill_pipeline_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("lead_id", sa.String(36), nullable=False, server_default=""),
        sa.Column("customer", sa.String(200), nullable=False, server_default=""),
        sa.Column("kill_reason", sa.String(64), nullable=False, server_default="other"),
        sa.Column("learning", sa.Text(), nullable=False, server_default=""),
        sa.Column("amount_lost", sa.String(64), nullable=False, server_default=""),
        sa.Column("competitor", sa.String(120), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="killed"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    create_index_if_missing("ix_kill_pipeline_records_tenant_id", "kill_pipeline_records", ["tenant_id"])
    create_index_if_missing("ix_kill_pipeline_records_app_public_id", "kill_pipeline_records", ["app_public_id"])
    create_index_if_missing("ix_kill_pipeline_records_record_no", "kill_pipeline_records", ["record_no"])
    create_index_if_missing("ix_kill_pipeline_records_lead_id", "kill_pipeline_records", ["lead_id"])
    create_index_if_missing("ix_kill_pipeline_records_status", "kill_pipeline_records", ["status"])


def downgrade() -> None:
    op.drop_table("kill_pipeline_records")
    op.drop_table("deal_evidence_records")
