from sqlalchemy.orm import Session
from app.models.alert import Alert
from app.models.device import Device
from app.services.power_prediction_service import estimate_ups_runtime_minutes

HIGH_TEMPERATURE_THRESHOLD = 35.0
HIGH_HUMIDITY_THRESHOLD = 75.0
LOW_BATTERY_THRESHOLD = 30.0
HIGH_LOAD_THRESHOLD = 80.0
LOW_RUNTIME_THRESHOLD_MINUTES = 20.0
CRITICAL_RUNTIME_THRESHOLD_MINUTES = 10.0

def check_telemetry_alerts(
    db: Session,
    device: Device,
    temperature: float,
    humidity: float,
    power_source: str | None = None,
    battery_percent: float | None = None,
    load_percent: float | None = None
):
    alerts = []

    if temperature >= HIGH_TEMPERATURE_THRESHOLD:
        alerts.append(
            Alert(
                device_id=device.id,
                alert_type="HIGH_TEMPERATURE",
                severity="critical",
                message=f"Temperature is too high: {temperature}°C"
            )
        )

    if humidity >= HIGH_HUMIDITY_THRESHOLD:
        alerts.append(
            Alert(
                device_id=device.id,
                alert_type="HIGH_HUMIDITY",
                severity="warning",
                message=f"Humidity is too high: {humidity}%"
            )
        )

    if power_source == "ups":
        alerts.append(
            Alert(
                device_id=device.id,
                alert_type="UPS_MODE",
                severity="warning",
                message="Device is running on UPS power"
            )
        )

    if battery_percent is not None and battery_percent <= LOW_BATTERY_THRESHOLD:
        alerts.append(
            Alert(
                device_id=device.id,
                alert_type="LOW_BATTERY",
                severity="critical",
                message=f"UPS battery is low: {battery_percent}%"
            )
        )

    if load_percent is not None and load_percent >= HIGH_LOAD_THRESHOLD:
        alerts.append(
            Alert(
                device_id=device.id,
                alert_type="HIGH_LOAD",
                severity="warning",
                message=f"Load is high: {load_percent}%"
            )
        )

    estimated_runtime = estimate_ups_runtime_minutes(
        power_source=power_source,
        battery_percent=battery_percent,
        load_percent=load_percent
    )

    if estimated_runtime is not None:
        if estimated_runtime <= CRITICAL_RUNTIME_THRESHOLD_MINUTES:
            alerts.append(
                Alert(
                    device_id=device.id,
                    alert_type="CRITICAL_RUNTIME",
                    severity="critical",
                    message=f"Estimated UPS runtime is critically low: {estimated_runtime} minutes"
                )
            )
        elif estimated_runtime <= LOW_RUNTIME_THRESHOLD_MINUTES:
            alerts.append(
                Alert(
                    device_id=device.id,
                    alert_type="LOW_RUNTIME",
                    severity="warning",
                    message=f"Estimated UPS runtime is low: {estimated_runtime} minutes"
                )
            )

    for alert in alerts:
        db.add(alert)

    return alerts