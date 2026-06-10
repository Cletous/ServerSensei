from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from app.core.timezone import local_now
from app.core.database import Base

class PushToken(Base):
    __tablename__ = "push_tokens"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    token = Column(String(255), unique=True, index=True, nullable=False)
    platform = Column(String(50), nullable=True)

    active = Column(Boolean, default=True, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=local_now
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=local_now,
        onupdate=local_now
    )