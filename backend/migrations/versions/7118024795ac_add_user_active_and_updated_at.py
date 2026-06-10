"""add user active and updated at

Revision ID: 7118024795ac
Revises: eebf36b3bb4e
Create Date: 2026-06-10 00:42:28.879632

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "7118024795ac"
down_revision: Union[str, Sequence[str], None] = "eebf36b3bb4e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [column["name"] for column in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    if not column_exists("users", "active"):
        op.add_column(
            "users",
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("1"))
        )

    if not column_exists("users", "updated_at"):
        op.add_column(
            "users",
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.local_now, nullable=True)
        )


def downgrade() -> None:
    if column_exists("users", "updated_at"):
        op.drop_column("users", "updated_at")

    if column_exists("users", "active"):
        op.drop_column("users", "active")