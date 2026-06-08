from datetime import datetime
from pydantic import BaseModel, Field


class DeviceSettingUpdateRequest(BaseModel):
    fan_on_temperature: float | None = Field(default=None, ge=0, le=80)
    fan_off_temperature: float | None = Field(default=None, ge=0, le=80)

    low_runtime_threshold_minutes: float | None = Field(default=None, ge=0)
    critical_runtime_threshold_minutes: float | None = Field(default=None, ge=0)

    demo_ups_full_drain_seconds_at_100_load: float | None = Field(default=None, ge=10)
    demo_battery_recovery_percent_per_second: float | None = Field(default=None, ge=0)
    demo_restart_battery_percent: float | None = Field(default=None, ge=0, le=100)


class DeviceSettingResponse(BaseModel):
    device_id: str

    fan_on_temperature: float
    fan_off_temperature: float

    low_runtime_threshold_minutes: float
    critical_runtime_threshold_minutes: float

    demo_ups_full_drain_seconds_at_100_load: float
    demo_battery_recovery_percent_per_second: float
    demo_restart_battery_percent: float

    settings_version: int
    updated_at: datetime | None = None