"""App branding columns on apps table.

Revision ID: 007
Revises: 006
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("apps", sa.Column("icon_url", sa.String(512), nullable=False, server_default=""))
    op.add_column("apps", sa.Column("primary_color", sa.String(16), nullable=False, server_default="#4338ca"))


def downgrade() -> None:
    op.drop_column("apps", "primary_color")
    op.drop_column("apps", "icon_url")
