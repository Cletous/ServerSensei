"""add cooling status to sensor readings

Revision ID: 20260610_0006
Revises: 20260610_0005
Create Date: 2026-06-10
"""

from alembic import op
import sqlalchemy as sa

revision = "20260610_0006"
down_revision = "20260610_0005"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column(
        "sensor_readings",
        sa.Column("fan_on", sa.Boolean(), nullable=True),
    )

    op.add_column(
        "sensor_readings",
        sa.Column("cooling_reason", sa.String(length=255), nullable=True),
    )


def downgrade():
    op.drop_column("sensor_readings", "cooling_reason")
    op.drop_column("sensor_readings", "fan_on")