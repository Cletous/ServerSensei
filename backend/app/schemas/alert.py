from datetime import datetime
from pydantic import BaseModel

class AlertResponse(BaseModel):
    id: int
    device_id: int
    alert_type: str
    severity: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True