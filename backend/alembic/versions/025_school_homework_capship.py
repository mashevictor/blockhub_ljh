"""school_notice + homework_qa tables (CapShip danmaku s15/s16).

Revision ID: 025
Revises: 024
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "025"
down_revision: Union[str, None] = "024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "school_notice_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("audience", sa.String(120), nullable=False, server_default=""),
        sa.Column("category", sa.String(32), nullable=False, server_default="notice"),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="published"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_school_notice_records_tenant_id", ["tenant_id"]),
        ("ix_school_notice_records_app_public_id", ["app_public_id"]),
        ("ix_school_notice_records_reporter_id", ["reporter_id"]),
        ("ix_school_notice_records_record_no", ["record_no"]),
        ("ix_school_notice_records_status", ["status"]),
    ):
        create_index_if_missing(name, "school_notice_records", cols)

    create_table_if_missing(
        "homework_qa_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("student_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("subject", sa.String(64), nullable=False, server_default=""),
        sa.Column("category", sa.String(32), nullable=False, server_default="homework"),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_homework_qa_records_tenant_id", ["tenant_id"]),
        ("ix_homework_qa_records_app_public_id", ["app_public_id"]),
        ("ix_homework_qa_records_reporter_id", ["reporter_id"]),
        ("ix_homework_qa_records_record_no", ["record_no"]),
        ("ix_homework_qa_records_status", ["status"]),
    ):
        create_index_if_missing(name, "homework_qa_records", cols)


def downgrade() -> None:
    op.drop_table("homework_qa_records")
    op.drop_table("school_notice_records")
