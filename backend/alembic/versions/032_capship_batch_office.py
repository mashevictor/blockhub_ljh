"""batch CapShip office: leave/expense/policy/hire/lead/quote/kpi (s01-s07).

Revision ID: 032
Revises: 031
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "032"
down_revision: Union[str, None] = "031"
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
        "leave_request_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("applicant", sa.String(120), nullable=False, server_default=""),
        sa.Column("start_at", sa.String(64), nullable=False, server_default=""),
        sa.Column("end_at", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("leave_request_records")

    create_table_if_missing(
        "expense_claim_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("amount", sa.String(64), nullable=False, server_default=""),
        sa.Column("invoice_no", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("expense_claim_records")

    create_table_if_missing(
        "policy_qa_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("dept", sa.String(120), nullable=False, server_default=""),
        sa.Column("answer", sa.String(200), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("policy_qa_records")

    create_table_if_missing(
        "hire_onboard_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("candidate", sa.String(200), nullable=False, server_default=""),
        sa.Column("stage", sa.String(64), nullable=False, server_default=""),
        sa.Column("owner", sa.String(120), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("hire_onboard_records")

    create_table_if_missing(
        "sales_lead_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("customer", sa.String(200), nullable=False, server_default=""),
        sa.Column("amount", sa.String(64), nullable=False, server_default=""),
        sa.Column("owner", sa.String(120), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("sales_lead_records")

    create_table_if_missing(
        "quote_contract_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("customer", sa.String(120), nullable=False, server_default=""),
        sa.Column("amount", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("quote_contract_records")

    create_table_if_missing(
        "ops_kpi_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("period", sa.String(64), nullable=False, server_default=""),
        sa.Column("value", sa.String(64), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    _capship_indexes("ops_kpi_records")


def downgrade() -> None:
    op.drop_table("ops_kpi_records")
    op.drop_table("quote_contract_records")
    op.drop_table("sales_lead_records")
    op.drop_table("hire_onboard_records")
    op.drop_table("policy_qa_records")
    op.drop_table("expense_claim_records")
    op.drop_table("leave_request_records")
