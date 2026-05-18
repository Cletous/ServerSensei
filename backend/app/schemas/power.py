from datetime import datetime
from pydantic import BaseModel

class PowerStatusResponse(BaseModel):
    device_id: str
    power_source: str
    battery_percent: float | None
    load_percent: float | None
    estimated_runtime_minutes: float | None
    updated_at: datetime