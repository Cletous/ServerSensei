from datetime import datetime
from typing import Any
from pydantic import BaseModel

class CommandCreateRequest(BaseModel):
    device_id: str
    action: str
    payload: dict[str, Any] | None = None

class CommandResultRequest(BaseModel):
    status: str

class CommandApprovalDecisionRequest(BaseModel):
    note: str | None = None

class CommandResponse(BaseModel):
    id: int
    device_id: str
    action: str
    payload: dict[str, Any] | None
    status: str

    created_by_user_id: int | None = None
    created_by_user_name: str | None = None
    created_by_user_email: str | None = None

    approved_by_user_id: int | None = None
    rejected_by_user_id: int | None = None

    created_at: datetime | None = None
    approved_at: datetime | None = None
    rejected_at: datetime | None = None
    executed_at: datetime | None = None

    class Config:
        from_attributes = True