from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)

    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=False
    )

    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)

    air_quality_raw = Column(Integer, nullable=True)
    air_quality_status = Column(String(50), nullable=True)

    power_source = Column(String(50), nullable=True)
    battery_percent = Column(Float, nullable=True)
    load_percent = Column(Float, nullable=True)

    environmental_risk = Column(String(50), nullable=True)
    system_recommendation = Column(String(255), nullable=True)

    fan_on = Column(Boolean, nullable=True)
    cooling_reason = Column(String(255), nullable=True)

    non_critical_server_a_on = Column(Boolean, nullable=True)
    non_critical_server_b_on = Column(Boolean, nullable=True)
    critical_server_a_on = Column(Boolean, nullable=True)
    critical_server_b_on = Column(Boolean, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )