from datetime import datetime
from pydantic import BaseModel

class AlertResponse(BaseModel):
    id: int
    device_id: str
    alert_type: str
    severity: str
    message: str
    created_at: datetime