from datetime import datetime
from typing import Any
from pydantic import BaseModel

class CommandCreateRequest(BaseModel):
    device_id: str
    action: str
    payload: dict[str, Any] | None = None

class CommandResponse(BaseModel):
    id: int
    device_id: str
    action: str
    payload: dict[str, Any] | None
    status: str
    created_at: datetime
    executed_at: datetime | None

class CommandResultRequest(BaseModel):
    status: str
    message: str | None = None