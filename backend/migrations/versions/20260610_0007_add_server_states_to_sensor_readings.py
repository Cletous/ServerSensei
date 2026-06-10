"""add server states to sensor readings

Revision ID: 20260610_0007
Revises: 20260610_0006
Create Date: 2026-06-10
"""

from alembic import op
import sqlalchemy as sa


revision = "20260610_0007"
down_revision = "20260610_0006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "sensor_readings",
        sa.Column("non_critical_server_a_on", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "sensor_readings",
        sa.Column("non_critical_server_b_on", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "sensor_readings",
        sa.Column("critical_server_a_on", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "sensor_readings",
        sa.Column("critical_server_b_on", sa.Boolean(), nullable=True),
    )


def downgrade():
    op.drop_column("sensor_readings", "critical_server_b_on")
    op.drop_column("sensor_readings", "critical_server_a_on")
    op.drop_column("sensor_readings", "non_critical_server_b_on")
    op.drop_column("sensor_readings", "non_critical_server_a_on")