"""add command approval fields

Revision ID: 20260610_0004
Revises: 7118024795ac
Create Date: 2026-06-10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260610_0004"
down_revision: Union[str, None] = "7118024795ac"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "commands",
        sa.Column("approved_by_user_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "commands",
        sa.Column("rejected_by_user_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "commands",
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "commands",
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True)
    )

    op.create_foreign_key(
        "fk_commands_approved_by_user_id_users",
        "commands",
        "users",
        ["approved_by_user_id"],
        ["id"],
    )

    op.create_foreign_key(
        "fk_commands_rejected_by_user_id_users",
        "commands",
        "users",
        ["rejected_by_user_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_commands_rejected_by_user_id_users",
        "commands",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_commands_approved_by_user_id_users",
        "commands",
        type_="foreignkey",
    )

    op.drop_column("commands", "rejected_at")
    op.drop_column("commands", "approved_at")
    op.drop_column("commands", "rejected_by_user_id")
    op.drop_column("commands", "approved_by_user_id")