"""add push tokens table

Revision ID: eebf36b3bb4e
Revises: 2f003d27093f
Create Date: 2026-06-09 22:10:27.420463

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "eebf36b3bb4e"
down_revision: Union[str, Sequence[str], None] = "2f003d27093f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not table_exists("push_tokens"):
        op.create_table(
            "push_tokens",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("token", sa.String(length=255), nullable=False),
            sa.Column("platform", sa.String(length=50), nullable=True),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

        op.create_index(
            op.f("ix_push_tokens_id"),
            "push_tokens",
            ["id"],
            unique=False
        )

        op.create_index(
            op.f("ix_push_tokens_token"),
            "push_tokens",
            ["token"],
            unique=True
        )


def downgrade() -> None:
    if table_exists("push_tokens"):
        op.drop_index(op.f("ix_push_tokens_token"), table_name="push_tokens")
        op.drop_index(op.f("ix_push_tokens_id"), table_name="push_tokens")
        op.drop_table("push_tokens")