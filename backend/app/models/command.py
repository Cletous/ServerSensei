from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from app.core.timezone import local_now

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

    approved_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    rejected_by_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    action = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=True)

    # Supported statuses:
    # awaiting_approval
    # pending
    # executed
    # failed
    # rejected
    status = Column(String(50), default="pending", nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=local_now
    )

    approved_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    rejected_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    executed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )