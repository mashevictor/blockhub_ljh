"""contracts + assets + events

Revision ID: 005
Revises: 004
Create Date: 2026-07-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if not insp.has_table("contracts"):
        op.create_table(
            "contracts",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("tenant_id", sa.String(length=36), nullable=False),
            sa.Column("title", sa.String(length=300), nullable=False),
            sa.Column("template_key", sa.String(length=64), nullable=False, server_default="blank"),
            sa.Column("body_html", sa.Text(), nullable=False, server_default=""),
            sa.Column("parties_json", sa.JSON(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
            sa.Column("review_notes", sa.Text(), nullable=False, server_default=""),
            sa.Column("signed_pdf_key", sa.String(length=512), nullable=False, server_default=""),
            sa.Column("created_by_id", sa.String(length=36), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
            sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_contracts_tenant_id", "contracts", ["tenant_id"])
        op.create_index("ix_contracts_status", "contracts", ["status"])

    if not insp.has_table("contract_assets"):
        op.create_table(
            "contract_assets",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("contract_id", sa.String(length=36), nullable=False),
            sa.Column("asset_type", sa.String(length=32), nullable=False),
            sa.Column("file_key", sa.String(length=512), nullable=False),
            sa.Column("label", sa.String(length=120), nullable=False, server_default=""),
            sa.Column("placement_json", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["contract_id"], ["contracts.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_contract_assets_contract_id", "contract_assets", ["contract_id"])

    if not insp.has_table("contract_events"):
        op.create_table(
            "contract_events",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("contract_id", sa.String(length=36), nullable=False),
            sa.Column("actor_id", sa.String(length=36), nullable=True),
            sa.Column("action", sa.String(length=64), nullable=False),
            sa.Column("payload_json", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["contract_id"], ["contracts.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_contract_events_contract_id", "contract_events", ["contract_id"])


def downgrade() -> None:
    op.drop_index("ix_contract_events_contract_id", table_name="contract_events")
    op.drop_table("contract_events")
    op.drop_index("ix_contract_assets_contract_id", table_name="contract_assets")
    op.drop_table("contract_assets")
    op.drop_index("ix_contracts_status", table_name="contracts")
    op.drop_index("ix_contracts_tenant_id", table_name="contracts")
    op.drop_table("contracts")
