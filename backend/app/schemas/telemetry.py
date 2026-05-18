from datetime import datetime
from pydantic import BaseModel

class TelemetryRequest(BaseModel):
    device_id: str
    temperature: float
    humidity: float
    wifi: str
    mode: str
    uptime: int

    power_source: str | None = None
    battery_percent: float | None = None
    load_percent: float | None = None

class TelemetryResponse(BaseModel):
    message: str

class TelemetryReadingResponse(BaseModel):
    id: int
    temperature: float
    humidity: float
    created_at: datetime

    class Config:
        from_attributes = True