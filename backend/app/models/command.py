from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.sql import func

from app.core.database import Base

class Command(Base):
    __tablename__ = "commands"

    id = Column(Integer, primary_key=True, index=True)

    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=False
    )

    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    action = Column(String, nullable=False)
    payload = Column(JSON, nullable=True)

    status = Column(String, default="pending", nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    executed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )