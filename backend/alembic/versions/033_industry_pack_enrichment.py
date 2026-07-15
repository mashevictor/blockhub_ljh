"""Industry pack enrichment columns on catalog_industry_packs.

Revision ID: 033
Revises: 032
"""

import sys
from pathlib import Path
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ops_utils import add_column_if_missing, has_column

revision: str = "033"
down_revision: Union[str, None] = "032"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    add_column_if_missing(
        "catalog_industry_packs",
        sa.Column("enrichment_json", sa.JSON(), nullable=True),
    )
    add_column_if_missing(
        "catalog_industry_packs",
        sa.Column("enriched_at", sa.DateTime(timezone=True), nullable=True),
    )
    add_column_if_missing(
        "catalog_industry_packs",
        sa.Column("enrichment_source", sa.String(32), nullable=False, server_default=""),
    )


def downgrade() -> None:
    for col in ("enrichment_source", "enriched_at", "enrichment_json"):
        if has_column("catalog_industry_packs", col):
            op.drop_column("catalog_industry_packs", col)
