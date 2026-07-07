"""Plaza visibility columns on apps table.

Revision ID: 008
Revises: 007
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "apps",
        sa.Column("plaza_visibility", sa.String(32), nullable=False, server_default="none"),
    )
    op.add_column(
        "apps",
        sa.Column("plaza_dept_name", sa.String(120), nullable=False, server_default=""),
    )
    op.add_column(
        "apps",
        sa.Column("plaza_published_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("apps", "plaza_published_at")
    op.drop_column("apps", "plaza_dept_name")
    op.drop_column("apps", "plaza_visibility")
