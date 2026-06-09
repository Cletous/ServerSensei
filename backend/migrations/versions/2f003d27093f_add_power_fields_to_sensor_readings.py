"""add power fields to sensor readings

Revision ID: 2f003d27093f
Revises: f07cc42c4c85
Create Date: 2026-06-09 21:07:57.082208

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '2f003d27093f'
down_revision: Union[str, Sequence[str], None] = 'f07cc42c4c85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [column["name"] for column in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    if not column_exists("sensor_readings", "power_source"):
        op.add_column(
            "sensor_readings",
            sa.Column("power_source", sa.String(length=50), nullable=True)
        )

    if not column_exists("sensor_readings", "battery_percent"):
        op.add_column(
            "sensor_readings",
            sa.Column("battery_percent", sa.Float(), nullable=True)
        )

    if not column_exists("sensor_readings", "load_percent"):
        op.add_column(
            "sensor_readings",
            sa.Column("load_percent", sa.Float(), nullable=True)
        )


def downgrade() -> None:
    if column_exists("sensor_readings", "load_percent"):
        op.drop_column("sensor_readings", "load_percent")

    if column_exists("sensor_readings", "battery_percent"):
        op.drop_column("sensor_readings", "battery_percent")

    if column_exists("sensor_readings", "power_source"):
        op.drop_column("sensor_readings", "power_source")