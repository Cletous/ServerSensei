from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
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

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )