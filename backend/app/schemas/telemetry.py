from datetime import datetime
from pydantic import BaseModel

class TelemetryRequest(BaseModel):
    device_id: str
    temperature: float
    humidity: float
    wifi: str
    mode: str
    uptime: int

class TelemetryResponse(BaseModel):
    message: str

class TelemetryReadingResponse(BaseModel):
    id: int
    temperature: float
    humidity: float
    created_at: datetime

    class Config:
        from_attributes = True