from datetime import datetime
from pydantic import BaseModel


class RecentAlertSummary(BaseModel):
    alert_type: str
    severity: str
    message: str
    created_at: datetime


class DecisionEvaluationResponse(BaseModel):
    device_id: str
    device_name: str
    mode: str
    online: bool

    temperature: float | None = None
    humidity: float | None = None
    air_quality_raw: int | None = None
    air_quality_status: str | None = None

    fan_on: bool | None = None
    cooling_reason: str | None = None

    power_source: str | None = None
    battery_percent: float | None = None
    load_percent: float | None = None
    estimated_runtime_minutes: float | None = None

    environmental_risk: str | None = None
    system_recommendation: str | None = None

    alert_count_recent: int
    highest_recent_severity: str | None = None
    recent_alerts: list[RecentAlertSummary]

    evaluation_summary: str
    latest_telemetry_at: datetime | None = None
    power_updated_at: datetime | None = None

    non_critical_server_a_on: bool | None = None
    non_critical_server_b_on: bool | None = None
    critical_server_a_on: bool | None = None
    critical_server_b_on: bool | None = None