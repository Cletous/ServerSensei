from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.sql import func
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=True
    )

    action = Column(String(100), nullable=False)

    entity_type = Column(String(100), nullable=True)
    entity_id = Column(Integer, nullable=True)

    description = Column(String(255), nullable=False)

    details = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )