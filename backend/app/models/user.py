from sqlalchemy import Boolean, Column, DateTime, Integer, String
from app.core.timezone import local_now

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    role = Column(String(50), default="viewer", nullable=False)
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