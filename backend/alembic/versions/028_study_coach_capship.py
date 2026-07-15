"""study_coach courses + drills (CapShip 课本学习闭环).

Revision ID: 028
Revises: 027
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "028"
down_revision: Union[str, None] = "027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _capship_indexes(table: str) -> None:
    for name, cols in (
        (f"ix_{table}_tenant_id", ["tenant_id"]),
        (f"ix_{table}_app_public_id", ["app_public_id"]),
        (f"ix_{table}_reporter_id", ["reporter_id"]),
        (f"ix_{table}_record_no", ["record_no"]),
        (f"ix_{table}_status", ["status"]),
    ):
        create_index_if_missing(name, table, cols)


def upgrade() -> None:
    create_table_if_missing(
        "study_coach_courses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("textbook_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("subject", sa.String(64), nullable=False, server_default=""),
        sa.Column("grade", sa.String(64), nullable=False, server_default=""),
        sa.Column("role", sa.String(32), nullable=False, server_default="student"),
        sa.Column("student_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("catalog_json", sa.JSON(), nullable=False),
        sa.Column("plan_json", sa.JSON(), nullable=False),
        sa.Column("plan_source", sa.String(32), nullable=False, server_default="fallback"),
        sa.Column("progress_pct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("study_coach_courses")

    create_table_if_missing(
        "study_coach_drills",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("course_id", sa.String(36), sa.ForeignKey("study_coach_courses.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("unit_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("kind", sa.String(32), nullable=False, server_default="review"),
        sa.Column("score", sa.String(32), nullable=False, server_default=""),
        sa.Column("result", sa.String(32), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="done"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("study_coach_drills")
    create_index_if_missing("ix_study_coach_drills_course_id", "study_coach_drills", ["course_id"])


def downgrade() -> None:
    op.drop_table("study_coach_drills")
    op.drop_table("study_coach_courses")
