"""Demo booking delivery: share token, agent summary, email/sms flags.

Revision ID: 018
Revises: 017
"""

import sys
from pathlib import Path
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ops_utils import add_column_if_missing, create_index_if_missing, has_column, has_table

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if not has_table("demo_bookings"):
        return
    add_column_if_missing(
        "demo_bookings",
        sa.Column("share_token", sa.String(32), nullable=False, server_default=""),
    )
    add_column_if_missing(
        "demo_bookings",
        sa.Column("agent_summary", sa.Text(), nullable=False, server_default=""),
    )
    add_column_if_missing(
        "demo_bookings",
        sa.Column("email_sent", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    add_column_if_missing(
        "demo_bookings",
        sa.Column("sms_sent", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    add_column_if_missing(
        "demo_bookings",
        sa.Column("delivery_status", sa.String(32), nullable=False, server_default="pending"),
    )
    if has_column("demo_bookings", "share_token"):
        create_index_if_missing("ix_demo_bookings_share_token", "demo_bookings", ["share_token"])


def downgrade() -> None:
    if not has_table("demo_bookings"):
        return
    op.drop_index("ix_demo_bookings_share_token", table_name="demo_bookings")
    for col in ("delivery_status", "sms_sent", "email_sent", "agent_summary", "share_token"):
        if has_column("demo_bookings", col):
            op.drop_column("demo_bookings", col)
