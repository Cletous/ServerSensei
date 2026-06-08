from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer
from sqlalchemy.sql import func

from app.core.database import Base


class DeviceSetting(Base):
    __tablename__ = "device_settings"

    id = Column(Integer, primary_key=True, index=True)

    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=False,
        unique=True
    )

    fan_on_temperature = Column(Float, default=28.0, nullable=False)
    fan_off_temperature = Column(Float, default=24.0, nullable=False)

    low_runtime_threshold_minutes = Column(Float, default=0.75, nullable=False)
    critical_runtime_threshold_minutes = Column(Float, default=0.35, nullable=False)

    demo_ups_full_drain_seconds_at_100_load = Column(Float, default=120.0, nullable=False)
    demo_battery_recovery_percent_per_second = Column(Float, default=2.0, nullable=False)
    demo_restart_battery_percent = Column(Float, default=10.0, nullable=False)

    settings_version = Column(Integer, default=1, nullable=False)

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )