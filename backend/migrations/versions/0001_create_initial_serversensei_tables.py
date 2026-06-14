"""create initial serversensei tables

Revision ID: 0001_create_initial_tables
Revises:
Create Date: 2026-06-14
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_create_initial_tables"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="viewer"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "devices",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("device_id", sa.String(length=100), nullable=False),
        sa.Column("device_name", sa.String(length=100), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("mode", sa.String(length=50), nullable=False, server_default="monitor"),
        sa.Column("online", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_devices_device_id", "devices", ["device_id"], unique=True)

    op.create_table(
        "device_status",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=False, unique=True),
        sa.Column("wifi_status", sa.String(length=50), nullable=False),
        sa.Column("mode", sa.String(length=50), nullable=False, server_default="monitor"),
        sa.Column("uptime", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "device_settings",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=False, unique=True),
        sa.Column("fan_on_temperature", sa.Float(), nullable=False, server_default="28.0"),
        sa.Column("fan_off_temperature", sa.Float(), nullable=False, server_default="24.0"),
        sa.Column("low_runtime_threshold_minutes", sa.Float(), nullable=False, server_default="0.75"),
        sa.Column("critical_runtime_threshold_minutes", sa.Float(), nullable=False, server_default="0.35"),
        sa.Column("demo_ups_full_drain_seconds_at_100_load", sa.Float(), nullable=False, server_default="120.0"),
        sa.Column("demo_battery_recovery_percent_per_second", sa.Float(), nullable=False, server_default="2.0"),
        sa.Column("demo_restart_battery_percent", sa.Float(), nullable=False, server_default="10.0"),
        sa.Column("settings_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "sensor_readings",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=False),
        sa.Column("temperature", sa.Float(), nullable=False),
        sa.Column("humidity", sa.Float(), nullable=False),
        sa.Column("air_quality_raw", sa.Integer(), nullable=True),
        sa.Column("air_quality_status", sa.String(length=50), nullable=True),
        sa.Column("power_source", sa.String(length=50), nullable=True),
        sa.Column("battery_percent", sa.Float(), nullable=True),
        sa.Column("load_percent", sa.Float(), nullable=True),
        sa.Column("environmental_risk", sa.String(length=50), nullable=True),
        sa.Column("system_recommendation", sa.String(length=255), nullable=True),
        sa.Column("fan_on", sa.Boolean(), nullable=True),
        sa.Column("cooling_reason", sa.String(length=255), nullable=True),
        sa.Column("non_critical_server_a_on", sa.Boolean(), nullable=True),
        sa.Column("non_critical_server_b_on", sa.Boolean(), nullable=True),
        sa.Column("critical_server_a_on", sa.Boolean(), nullable=True),
        sa.Column("critical_server_b_on", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=False),
        sa.Column("alert_type", sa.String(length=100), nullable=False),
        sa.Column("severity", sa.String(length=50), nullable=False),
        sa.Column("message", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "commands",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("rejected_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "power_status",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=False, unique=True),
        sa.Column("power_source", sa.String(length=50), nullable=False, server_default="unknown"),
        sa.Column("battery_percent", sa.Float(), nullable=True),
        sa.Column("load_percent", sa.Float(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "push_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column("platform", sa.String(length=50), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_push_tokens_token", "push_tokens", ["token"], unique=True)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("push_tokens")
    op.drop_table("power_status")
    op.drop_table("commands")
    op.drop_table("alerts")
    op.drop_table("sensor_readings")
    op.drop_table("device_settings")
    op.drop_table("device_status")
    op.drop_table("devices")
    op.drop_table("users")