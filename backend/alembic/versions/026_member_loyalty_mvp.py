"""member_loyalty MVP tables: members / campaigns / point_txns / outreaches.

Revision ID: 026
Revises: 025
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "026"
down_revision: Union[str, None] = "025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "member_loyalty_members",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False, server_default=""),
        sa.Column("phone", sa.String(32), nullable=False, server_default=""),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_visit_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_member_loyalty_members_tenant_id", ["tenant_id"]),
        ("ix_member_loyalty_members_app_public_id", ["app_public_id"]),
        ("ix_member_loyalty_members_reporter_id", ["reporter_id"]),
        ("ix_member_loyalty_members_phone", ["phone"]),
        ("ix_member_loyalty_members_status", ["status"]),
    ):
        create_index_if_missing(name, "member_loyalty_members", cols)

    create_table_if_missing(
        "member_loyalty_campaigns",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False, server_default=""),
        sa.Column("campaign_type", sa.String(32), nullable=False, server_default="points"),
        sa.Column("rule_text", sa.String(500), nullable=False, server_default=""),
        sa.Column("points_delta", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_member_loyalty_campaigns_tenant_id", ["tenant_id"]),
        ("ix_member_loyalty_campaigns_app_public_id", ["app_public_id"]),
        ("ix_member_loyalty_campaigns_reporter_id", ["reporter_id"]),
        ("ix_member_loyalty_campaigns_status", ["status"]),
    ):
        create_index_if_missing(name, "member_loyalty_campaigns", cols)

    create_table_if_missing(
        "member_loyalty_point_txns",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("member_id", sa.String(36), sa.ForeignKey("member_loyalty_members.id"), nullable=False),
        sa.Column("campaign_id", sa.String(36), nullable=False, server_default=""),
        sa.Column("txn_type", sa.String(32), nullable=False, server_default="earn"),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reason", sa.String(500), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_member_loyalty_point_txns_tenant_id", ["tenant_id"]),
        ("ix_member_loyalty_point_txns_app_public_id", ["app_public_id"]),
        ("ix_member_loyalty_point_txns_reporter_id", ["reporter_id"]),
        ("ix_member_loyalty_point_txns_member_id", ["member_id"]),
    ):
        create_index_if_missing(name, "member_loyalty_point_txns", cols)

    create_table_if_missing(
        "member_loyalty_outreaches",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("member_id", sa.String(36), sa.ForeignKey("member_loyalty_members.id"), nullable=False),
        sa.Column("campaign_id", sa.String(36), nullable=False, server_default=""),
        sa.Column("message", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_member_loyalty_outreaches_tenant_id", ["tenant_id"]),
        ("ix_member_loyalty_outreaches_app_public_id", ["app_public_id"]),
        ("ix_member_loyalty_outreaches_reporter_id", ["reporter_id"]),
        ("ix_member_loyalty_outreaches_member_id", ["member_id"]),
        ("ix_member_loyalty_outreaches_status", ["status"]),
    ):
        create_index_if_missing(name, "member_loyalty_outreaches", cols)


def downgrade() -> None:
    op.drop_table("member_loyalty_outreaches")
    op.drop_table("member_loyalty_point_txns")
    op.drop_table("member_loyalty_campaigns")
    op.drop_table("member_loyalty_members")
