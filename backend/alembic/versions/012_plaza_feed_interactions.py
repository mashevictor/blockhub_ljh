"""Plaza feed likes & comments tables.

Revision ID: 012
Revises: 011
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "plaza_feed_likes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("app_public_id", sa.String(16), nullable=False),
        sa.Column("user_key", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_plaza_feed_likes_app_public_id", "plaza_feed_likes", ["app_public_id"])
    op.create_index("ix_plaza_feed_likes_user_key", "plaza_feed_likes", ["user_key"])

    op.create_table(
        "plaza_feed_comments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("app_public_id", sa.String(16), nullable=False),
        sa.Column("author_name", sa.String(120), nullable=False, server_default="访客"),
        sa.Column("text", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_plaza_feed_comments_app_public_id", "plaza_feed_comments", ["app_public_id"])


def downgrade() -> None:
    op.drop_index("ix_plaza_feed_comments_app_public_id", table_name="plaza_feed_comments")
    op.drop_table("plaza_feed_comments")
    op.drop_index("ix_plaza_feed_likes_user_key", table_name="plaza_feed_likes")
    op.drop_index("ix_plaza_feed_likes_app_public_id", table_name="plaza_feed_likes")
    op.drop_table("plaza_feed_likes")
