"""App page_schema and build_manifest for modular runtime.

Revision ID: 011
Revises: 010
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("apps", sa.Column("page_schema", sa.JSON(), nullable=True))
    op.add_column("apps", sa.Column("build_manifest", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("apps", "build_manifest")
    op.drop_column("apps", "page_schema")
