"""029 catalog_json on study_coach_courses (课本定位结果).

Revision ID: 029
Revises: 028
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect as sa_inspect

revision: str = "029"
down_revision: Union[str, None] = "028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa_inspect(bind)
    if not insp.has_table("study_coach_courses"):
        return
    cols = {c["name"] for c in insp.get_columns("study_coach_courses")}
    if "catalog_json" not in cols:
        op.add_column(
            "study_coach_courses",
            sa.Column("catalog_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        )
        try:
            op.alter_column("study_coach_courses", "catalog_json", server_default=None)
        except Exception:
            pass


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa_inspect(bind)
    if not insp.has_table("study_coach_courses"):
        return
    cols = {c["name"] for c in insp.get_columns("study_coach_courses")}
    if "catalog_json" in cols:
        op.drop_column("study_coach_courses", "catalog_json")
