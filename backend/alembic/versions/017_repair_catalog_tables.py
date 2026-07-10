"""Repair missing catalog tables when alembic is stamped ahead of schema.

Revision ID: 017
Revises: 016
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "catalog_agents",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("icon", sa.String(16), nullable=False, server_default=""),
        sa.Column("color", sa.String(32), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("pipeline", sa.Text(), nullable=False, server_default=""),
        sa.Column("capability_keys", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("office_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("industry_count", sa.Integer(), nullable=False, server_default="0"),
    )

    create_table_if_missing(
        "catalog_capabilities",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("category", sa.String(64), nullable=False),
        sa.Column("widget", sa.String(64), nullable=False, server_default=""),
        sa.Column("agent_id", sa.String(64), nullable=False),
    )
    create_index_if_missing("ix_catalog_capabilities_agent_id", "catalog_capabilities", ["agent_id"])

    create_table_if_missing(
        "catalog_office_groups",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("category", sa.String(64), nullable=False),
        sa.Column("icon", sa.String(16), nullable=False, server_default=""),
        sa.Column("agent", sa.String(64), nullable=False, server_default=""),
        sa.Column("items", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )

    create_table_if_missing(
        "catalog_industry_packs",
        sa.Column("key", sa.String(32), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("icon", sa.String(16), nullable=False, server_default=""),
        sa.Column("color", sa.String(32), nullable=False, server_default=""),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )

    create_table_if_missing(
        "catalog_office_scenarios",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(64), nullable=False),
        sa.Column("category_icon", sa.String(16), nullable=False, server_default=""),
        sa.Column("agent", sa.String(64), nullable=False, server_default=""),
        sa.Column("auto_generate", sa.Text(), nullable=False, server_default=""),
    )
    create_index_if_missing("ix_catalog_office_scenarios_category", "catalog_office_scenarios", ["category"])

    create_table_if_missing(
        "catalog_industry_scenarios",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(64), nullable=False),
        sa.Column("pack_key", sa.String(32), nullable=False),
        sa.Column("pack_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("pack_icon", sa.String(16), nullable=False, server_default=""),
        sa.Column("pack_color", sa.String(32), nullable=False, server_default=""),
        sa.Column("problem", sa.Text(), nullable=False, server_default=""),
        sa.Column("pages", sa.String(64), nullable=False, server_default=""),
        sa.Column("standard", sa.String(32), nullable=False, server_default=""),
        sa.Column("agent", sa.String(64), nullable=False, server_default=""),
    )
    create_index_if_missing("ix_catalog_industry_scenarios_category", "catalog_industry_scenarios", ["category"])
    create_index_if_missing("ix_catalog_industry_scenarios_pack_key", "catalog_industry_scenarios", ["pack_key"])

    create_table_if_missing(
        "catalog_hero_presets",
        sa.Column("id", sa.String(16), primary_key=True),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("hint", sa.String(120), nullable=False),
        sa.Column("role", sa.String(64), nullable=False, server_default=""),
        sa.Column("weight", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("color", sa.String(32), nullable=False, server_default=""),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("picks", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("flow_lines", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )

    create_table_if_missing(
        "catalog_chip_templates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("text", sa.String(200), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("picks", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("scenario_names", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    pass
