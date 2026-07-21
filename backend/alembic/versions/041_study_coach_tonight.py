"""study_coach_tonight 今晚这一练。

Revision ID: 041
Revises: 040
"""

from typing import Sequence, Union

import sqlalchemy as sa
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "041"
down_revision: Union[str, None] = "040"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "study_coach_tonight",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("course_id", sa.String(36), sa.ForeignKey("study_coach_courses.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("unit_order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("unit_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("template", sa.String(32), nullable=False, server_default="dictation"),
        sa.Column("status", sa.String(32), nullable=False, server_default="preview"),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(32), nullable=False, server_default="fallback"),
        sa.Column("drill_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_study_coach_tonight_tenant_id", ["tenant_id"]),
        ("ix_study_coach_tonight_app_public_id", ["app_public_id"]),
        ("ix_study_coach_tonight_reporter_id", ["reporter_id"]),
        ("ix_study_coach_tonight_course_id", ["course_id"]),
        ("ix_study_coach_tonight_record_no", ["record_no"]),
        ("ix_study_coach_tonight_status", ["status"]),
    ):
        create_index_if_missing(name, "study_coach_tonight", cols)


def downgrade() -> None:
    pass
