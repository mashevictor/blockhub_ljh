"""Idempotent helpers for migrations on partially-applied databases."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


def has_table(name: str) -> bool:
    bind = op.get_bind()
    return inspect(bind).has_table(name)


def has_index(table: str, index_name: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    if not insp.has_table(table):
        return False
    return index_name in {idx["name"] for idx in insp.get_indexes(table)}


def create_table_if_missing(name: str, *columns: sa.Column, **kwargs) -> None:
    if not has_table(name):
        op.create_table(name, *columns, **kwargs)


def create_index_if_missing(index_name: str, table: str, columns: list[str], **kwargs) -> None:
    if has_table(table) and not has_index(table, index_name):
        op.create_index(index_name, table, columns, **kwargs)


def drop_index_if_exists(index_name: str, table: str) -> None:
    if has_table(table) and has_index(table, index_name):
        op.drop_index(index_name, table_name=table)


def drop_table_if_exists(name: str) -> None:
    if has_table(name):
        op.drop_table(name)


def has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    if not insp.has_table(table):
        return False
    return column in {c["name"] for c in insp.get_columns(table)}


def add_column_if_missing(table: str, column: sa.Column) -> None:
    if has_table(table) and not has_column(table, column.name):
        op.add_column(table, column)
