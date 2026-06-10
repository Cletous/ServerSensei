from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from app.core.timezone import local_now

from app.core.database import Base

class DeviceStatus(Base):
    __tablename__ = "device_status"

    id = Column(Integer, primary_key=True, index=True)

    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=False,
        unique=True
    )

    wifi_status = Column(String(50), nullable=False)
    mode = Column(String(50), default="monitor", nullable=False)
    uptime = Column(Integer, default=0, nullable=False)

    last_seen = Column(
        DateTime(timezone=True),
        default=local_now,
        onupdate=local_now
    )