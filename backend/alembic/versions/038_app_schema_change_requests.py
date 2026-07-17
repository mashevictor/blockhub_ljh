"""app page_schema 改页审批流：个人草稿 → pending → 管理员通过后写正式 schema。

Revision ID: 038
Revises: 037
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "038"
down_revision: Union[str, None] = "037"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "app_schema_change_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("app_id", sa.String(36), sa.ForeignKey("apps.id"), nullable=False),
        sa.Column("public_id", sa.String(16), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("base_rev", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("page_schema", sa.JSON(), nullable=True),
        sa.Column("capability_keys", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("summary", sa.String(240), nullable=False, server_default=""),
        sa.Column("author_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("author_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("reviewer_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewer_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("review_comment", sa.String(500), nullable=False, server_default=""),
        sa.Column("published_rev", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    create_index_if_missing("ix_app_schema_change_requests_public_id", "app_schema_change_requests", ["public_id"])
    create_index_if_missing("ix_app_schema_change_requests_app_id", "app_schema_change_requests", ["app_id"])
    create_index_if_missing("ix_app_schema_change_requests_status", "app_schema_change_requests", ["status"])
    create_index_if_missing("ix_app_schema_change_requests_author_id", "app_schema_change_requests", ["author_id"])
    create_index_if_missing(
        "ix_app_schema_change_requests_author_draft",
        "app_schema_change_requests",
        ["public_id", "author_id", "status"],
    )


def downgrade() -> None:
    op.drop_table("app_schema_change_requests")
