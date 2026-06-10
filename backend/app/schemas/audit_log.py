from datetime import datetime
from typing import Any
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: int

    user_id: int | None = None
    device_id: int | None = None

    action: str

    entity_type: str | None = None
    entity_id: int | None = None

    description: str
    details: dict[str, Any] | None = None

    created_at: datetime | None = None

    class Config:
        from_attributes = True