"""Plaza feed likes & comments tables.

Revision ID: 012
Revises: 011
"""

import sys
from pathlib import Path
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ops_utils import create_index_if_missing, create_table_if_missing, drop_index_if_exists, drop_table_if_exists

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "plaza_feed_likes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("app_public_id", sa.String(16), nullable=False),
        sa.Column("user_key", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    create_index_if_missing("ix_plaza_feed_likes_app_public_id", "plaza_feed_likes", ["app_public_id"])
    create_index_if_missing("ix_plaza_feed_likes_user_key", "plaza_feed_likes", ["user_key"])

    create_table_if_missing(
        "plaza_feed_comments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("app_public_id", sa.String(16), nullable=False),
        sa.Column("author_name", sa.String(120), nullable=False, server_default="访客"),
        sa.Column("text", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    create_index_if_missing("ix_plaza_feed_comments_app_public_id", "plaza_feed_comments", ["app_public_id"])


def downgrade() -> None:
    drop_index_if_exists("ix_plaza_feed_comments_app_public_id", "plaza_feed_comments")
    drop_table_if_exists("plaza_feed_comments")
    drop_index_if_exists("ix_plaza_feed_likes_user_key", "plaza_feed_likes")
    drop_index_if_exists("ix_plaza_feed_likes_app_public_id", "plaza_feed_likes")
    drop_table_if_exists("plaza_feed_likes")
