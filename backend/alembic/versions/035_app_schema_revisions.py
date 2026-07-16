"""app page_schema 乐观锁版本 + 修订历史（多人对话改页）.

Revision ID: 035
Revises: 034
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import add_column_if_missing, create_index_if_missing, create_table_if_missing

revision: str = "035"
down_revision: Union[str, None] = "034"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    add_column_if_missing(
        "apps",
        sa.Column("schema_rev", sa.Integer(), nullable=False, server_default="1"),
    )
    add_column_if_missing(
        "apps",
        sa.Column("schema_updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    add_column_if_missing(
        "apps",
        sa.Column("schema_updated_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
    )
    add_column_if_missing(
        "apps",
        sa.Column("schema_editor_name", sa.String(120), nullable=False, server_default=""),
    )

    create_table_if_missing(
        "app_schema_revisions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("app_id", sa.String(36), sa.ForeignKey("apps.id"), nullable=False),
        sa.Column("public_id", sa.String(16), nullable=False),
        sa.Column("rev", sa.Integer(), nullable=False),
        sa.Column("page_schema", sa.JSON(), nullable=True),
        sa.Column("capability_keys", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("summary", sa.String(240), nullable=False, server_default=""),
        sa.Column("source", sa.String(32), nullable=False, server_default="compose"),
        sa.Column("editor_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("editor_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    create_index_if_missing("ix_app_schema_revisions_public_id", "app_schema_revisions", ["public_id"])
    create_index_if_missing("ix_app_schema_revisions_app_id", "app_schema_revisions", ["app_id"])
    create_index_if_missing(
        "ix_app_schema_revisions_public_rev",
        "app_schema_revisions",
        ["public_id", "rev"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("app_schema_revisions")
    # columns on apps left in place for safety
