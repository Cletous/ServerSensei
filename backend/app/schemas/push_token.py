from datetime import datetime
from pydantic import BaseModel

class PushTokenRegisterRequest(BaseModel):
    token: str
    platform: str | None = None

class PushTokenResponse(BaseModel):
    id: int
    token: str
    platform: str | None
    active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True