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