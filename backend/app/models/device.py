from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)

    device_id = Column(String(100), unique=True, index=True, nullable=False)
    device_name = Column(String(100), nullable=False)
    location = Column(String(255), nullable=True)

    mode = Column(String(50), default="monitor", nullable=False)
    online = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )