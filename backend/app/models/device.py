from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)

    device_id = Column(String, unique=True, index=True, nullable=False)
    device_name = Column(String, nullable=False)
    location = Column(String, nullable=True)

    mode = Column(String, default="monitor", nullable=False)
    online = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )