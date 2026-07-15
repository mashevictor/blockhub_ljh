"""batch CapShip: wedding/deco/pet/gov/legal (s25/s26/s27/s29/s30).

Revision ID: 031
Revises: 030
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "031"
down_revision: Union[str, None] = "030"
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
        "wedding_plan_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("vendor", sa.String(120), nullable=False, server_default=""),
        sa.Column("budget", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("wedding_plan_records")

    create_table_if_missing(
        "deco_material_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("material_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("location", sa.String(120), nullable=False, server_default=""),
        sa.Column("budget", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("deco_material_records")

    create_table_if_missing(
        "pet_clinic_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("pet_name", sa.String(120), nullable=False, server_default=""),
        sa.Column("symptom", sa.String(200), nullable=False, server_default=""),
        sa.Column("schedule_at", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("pet_clinic_records")

    create_table_if_missing(
        "gov_service_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("dept", sa.String(120), nullable=False, server_default=""),
        sa.Column("ticket_no", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("gov_service_records")

    create_table_if_missing(
        "legal_case_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("party", sa.String(120), nullable=False, server_default=""),
        sa.Column("deadline", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("legal_case_records")


def downgrade() -> None:
    op.drop_table("legal_case_records")
    op.drop_table("gov_service_records")
    op.drop_table("pet_clinic_records")
    op.drop_table("deco_material_records")
    op.drop_table("wedding_plan_records")
