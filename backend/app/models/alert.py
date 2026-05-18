from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)

    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=False
    )

    alert_type = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)
    message = Column(String(255), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )