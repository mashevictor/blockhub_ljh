"""Demo booking leads from home page.

Revision ID: 016
Revises: 015
"""

import sys
from pathlib import Path
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ops_utils import create_index_if_missing, create_table_if_missing, drop_index_if_exists, drop_table_if_exists

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "demo_bookings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("contact_email", sa.String(255), nullable=False, server_default=""),
        sa.Column("contact_phone", sa.String(64), nullable=False, server_default=""),
        sa.Column("salutation", sa.String(120), nullable=False, server_default=""),
        sa.Column("company_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("source", sa.String(64), nullable=False, server_default="home"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    create_index_if_missing("ix_demo_bookings_created_at", "demo_bookings", ["created_at"])


def downgrade() -> None:
    drop_index_if_exists("ix_demo_bookings_created_at", "demo_bookings")
    drop_table_if_exists("demo_bookings")
