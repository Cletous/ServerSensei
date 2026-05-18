from sqlalchemy.orm import Session
from app.models.alert import Alert
from app.models.device import Device

HIGH_TEMPERATURE_THRESHOLD = 35.0
HIGH_HUMIDITY_THRESHOLD = 75.0

def check_telemetry_alerts(
    db: Session,
    device: Device,
    temperature: float,
    humidity: float
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

    for alert in alerts:
        db.add(alert)

    return alerts