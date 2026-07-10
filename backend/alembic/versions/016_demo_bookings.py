"""Demo booking leads from home page.

Revision ID: 016
Revises: 015
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "demo_bookings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("contact_email", sa.String(255), nullable=False, server_default=""),
        sa.Column("contact_phone", sa.String(64), nullable=False, server_default=""),
        sa.Column("salutation", sa.String(120), nullable=False, server_default=""),
        sa.Column("company_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("source", sa.String(64), nullable=False, server_default="home"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_demo_bookings_created_at", "demo_bookings", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_demo_bookings_created_at", table_name="demo_bookings")
    op.drop_table("demo_bookings")
