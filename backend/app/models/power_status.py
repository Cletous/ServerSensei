from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from app.core.timezone import local_now
from app.core.database import Base

class PowerStatus(Base):
    __tablename__ = "power_status"

    id = Column(Integer, primary_key=True, index=True)

    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=False,
        unique=True
    )

    power_source = Column(String(50), default="unknown", nullable=False)
    battery_percent = Column(Float, nullable=True)
    load_percent = Column(Float, nullable=True)

    updated_at = Column(
        DateTime(timezone=True),
        default=local_now,
        onupdate=local_now
    )