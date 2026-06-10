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

    air_quality_raw: int | None = None
    air_quality_status: str | None = None

    fan_on: bool | None = None
    cooling_reason: str | None = None

    environmental_risk: str | None = None
    system_recommendation: str | None = None

    non_critical_server_a_on: bool | None = None
    non_critical_server_b_on: bool | None = None
    critical_server_a_on: bool | None = None
    critical_server_b_on: bool | None = None

class TelemetryResponse(BaseModel):
    message: str

class TelemetryReadingResponse(BaseModel):
    id: int
    temperature: float
    humidity: float

    air_quality_raw: int | None = None
    air_quality_status: str | None = None

    power_source: str | None = None
    battery_percent: float | None = None
    load_percent: float | None = None

    fan_on: bool | None = None
    cooling_reason: str | None = None

    environmental_risk: str | None = None
    system_recommendation: str | None = None

    non_critical_server_a_on: bool | None = None
    non_critical_server_b_on: bool | None = None
    critical_server_a_on: bool | None = None
    critical_server_b_on: bool | None = None

    created_at: datetime

    class Config:
        from_attributes = True

class TelemetryHistoryPoint(BaseModel):
    created_at: datetime

    temperature: float | None = None
    humidity: float | None = None

    air_quality_raw: int | None = None
    air_quality_status: str | None = None

    power_source: str | None = None
    battery_percent: float | None = None
    load_percent: float | None = None

    environmental_risk: str | None = None
    system_recommendation: str | None = None