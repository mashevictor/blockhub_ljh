"""hero presets + chip templates

Revision ID: 004
Revises: 003
Create Date: 2026-07-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "catalog_hero_presets",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("hint", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=64), nullable=False, default=""),
        sa.Column("weight", sa.Integer(), nullable=False, default=3),
        sa.Column("color", sa.String(length=32), nullable=False, default=""),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("picks", sa.JSON(), nullable=False),
        sa.Column("flow_lines", sa.JSON(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, default=0),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "catalog_chip_templates",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("text", sa.String(length=200), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("picks", sa.JSON(), nullable=False),
        sa.Column("scenario_names", sa.JSON(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, default=0),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("catalog_chip_templates")
    op.drop_table("catalog_hero_presets")
