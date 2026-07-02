"""catalog tables for L3 scenarios, capabilities, agents

Revision ID: 003
Revises: 002
Create Date: 2026-07-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "catalog_agents",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("icon", sa.String(length=16), nullable=False),
        sa.Column("color", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("pipeline", sa.Text(), nullable=False),
        sa.Column("capability_keys", sa.JSON(), nullable=False),
        sa.Column("office_count", sa.Integer(), nullable=False),
        sa.Column("industry_count", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "catalog_capabilities",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("widget", sa.String(length=64), nullable=False),
        sa.Column("agent_id", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["catalog_agents.id"]),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_index(op.f("ix_catalog_capabilities_agent_id"), "catalog_capabilities", ["agent_id"], unique=False)

    op.create_table(
        "catalog_office_groups",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("icon", sa.String(length=16), nullable=False),
        sa.Column("agent", sa.String(length=64), nullable=False),
        sa.Column("items", sa.JSON(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "catalog_industry_packs",
        sa.Column("key", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("icon", sa.String(length=16), nullable=False),
        sa.Column("color", sa.String(length=32), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )

    op.create_table(
        "catalog_office_scenarios",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("category_icon", sa.String(length=16), nullable=False),
        sa.Column("agent", sa.String(length=64), nullable=False),
        sa.Column("auto_generate", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_catalog_office_scenarios_category"), "catalog_office_scenarios", ["category"], unique=False)

    op.create_table(
        "catalog_industry_scenarios",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("pack_key", sa.String(length=32), nullable=False),
        sa.Column("pack_name", sa.String(length=120), nullable=False),
        sa.Column("pack_icon", sa.String(length=16), nullable=False),
        sa.Column("pack_color", sa.String(length=32), nullable=False),
        sa.Column("problem", sa.Text(), nullable=False),
        sa.Column("pages", sa.String(length=64), nullable=False),
        sa.Column("standard", sa.String(length=32), nullable=False),
        sa.Column("agent", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_catalog_industry_scenarios_category"), "catalog_industry_scenarios", ["category"], unique=False)
    op.create_index(op.f("ix_catalog_industry_scenarios_pack_key"), "catalog_industry_scenarios", ["pack_key"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_catalog_industry_scenarios_pack_key"), table_name="catalog_industry_scenarios")
    op.drop_index(op.f("ix_catalog_industry_scenarios_category"), table_name="catalog_industry_scenarios")
    op.drop_table("catalog_industry_scenarios")
    op.drop_index(op.f("ix_catalog_office_scenarios_category"), table_name="catalog_office_scenarios")
    op.drop_table("catalog_office_scenarios")
    op.drop_table("catalog_industry_packs")
    op.drop_table("catalog_office_groups")
    op.drop_index(op.f("ix_catalog_capabilities_agent_id"), table_name="catalog_capabilities")
    op.drop_table("catalog_capabilities")
    op.drop_table("catalog_agents")
