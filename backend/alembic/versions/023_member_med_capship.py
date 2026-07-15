"""member_loyalty + med_triage tables (CapShip danmaku s11/s12).

Revision ID: 023
Revises: 022
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "023"
down_revision: Union[str, None] = "022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "member_loyalty_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("member_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("member_phone", sa.String(32), nullable=False, server_default=""),
        sa.Column("campaign_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_member_loyalty_records_tenant_id", ["tenant_id"]),
        ("ix_member_loyalty_records_app_public_id", ["app_public_id"]),
        ("ix_member_loyalty_records_reporter_id", ["reporter_id"]),
        ("ix_member_loyalty_records_record_no", ["record_no"]),
        ("ix_member_loyalty_records_status", ["status"]),
    ):
        create_index_if_missing(name, "member_loyalty_records", cols)

    create_table_if_missing(
        "med_triage_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("patient_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("symptoms", sa.Text(), nullable=False, server_default=""),
        sa.Column("suggested_dept", sa.String(120), nullable=False, server_default=""),
        sa.Column("urgency", sa.String(32), nullable=False, server_default="normal"),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_med_triage_records_tenant_id", ["tenant_id"]),
        ("ix_med_triage_records_app_public_id", ["app_public_id"]),
        ("ix_med_triage_records_reporter_id", ["reporter_id"]),
        ("ix_med_triage_records_record_no", ["record_no"]),
        ("ix_med_triage_records_status", ["status"]),
    ):
        create_index_if_missing(name, "med_triage_records", cols)


def downgrade() -> None:
    op.drop_table("med_triage_records")
    op.drop_table("member_loyalty_records")
