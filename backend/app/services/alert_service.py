from datetime import timedelta
from sqlalchemy.orm import Session
from app.core.timezone import local_now

from app.models.alert import Alert
from app.models.device import Device
from app.services.email_service import send_alert_email
from app.services.power_prediction_service import estimate_ups_runtime_minutes
from app.services.push_notification_service import send_alert_push_notifications

HIGH_TEMPERATURE_THRESHOLD = 35.0
HIGH_HUMIDITY_THRESHOLD = 75.0
LOW_BATTERY_THRESHOLD = 30.0
HIGH_LOAD_THRESHOLD = 80.0
LOW_RUNTIME_THRESHOLD_MINUTES = 20.0
CRITICAL_RUNTIME_THRESHOLD_MINUTES = 10.0
POOR_AIR_QUALITY_THRESHOLD = 1000
HAZARDOUS_AIR_QUALITY_THRESHOLD = 1500

ALERT_DEDUP_MINUTES = 30

def alert_exists_recently(
    db: Session,
    device_id: int,
    alert_type: str,
    minutes: int = ALERT_DEDUP_MINUTES
) -> bool:
    cutoff_time = local_now() - timedelta(minutes=minutes)

    existing_alert = db.query(Alert).filter(
        Alert.device_id == device_id,
        Alert.alert_type == alert_type,
        Alert.created_at >= cutoff_time
    ).first()

    return existing_alert is not None
    
def check_telemetry_alerts(
    db: Session,
    device: Device,
    temperature: float,
    humidity: float,
    power_source: str | None = None,
    battery_percent: float | None = None,
    load_percent: float | None = None,
    air_quality_raw: int | None = None,
    air_quality_status: str | None = None,
    environmental_risk: str | None = None,
    system_recommendation: str | None = None
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
    
    if air_quality_raw is not None:
        if air_quality_raw >= HAZARDOUS_AIR_QUALITY_THRESHOLD:
            alerts.append(
                Alert(
                    device_id=device.id,
                    alert_type="HAZARDOUS_AIR_QUALITY",
                    severity="critical",
                    message=f"Air quality is hazardous: {air_quality_raw} ({air_quality_status})"
                )
            )
        elif air_quality_raw >= POOR_AIR_QUALITY_THRESHOLD:
            alerts.append(
                Alert(
                    device_id=device.id,
                    alert_type="POOR_AIR_QUALITY",
                    severity="warning",
                    message=f"Air quality is poor: {air_quality_raw} ({air_quality_status})"
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

    if environmental_risk == "high":
        alerts.append(
            Alert(
                device_id=device.id,
                alert_type="ENVIRONMENTAL_RISK_HIGH",
                severity="warning",
                message=(
                    system_recommendation
                    or "High environmental risk detected"
                )
            )
        )

    if environmental_risk == "critical":
        alerts.append(
            Alert(
                device_id=device.id,
                alert_type="ENVIRONMENTAL_RISK_CRITICAL",
                severity="critical",
                message=(
                    system_recommendation
                    or "Critical environmental risk detected"
                )
            )
        )

    if (
        power_source == "ups" and
        environmental_risk in ["high", "critical"]
    ):
        alerts.append(
            Alert(
                device_id=device.id,
                alert_type="POWER_ENVIRONMENT_COMBINED_RISK",
                severity="critical",
                message=(
                    "Combined risk: UPS mode and elevated environmental risk detected. "
                    "Preserve critical services and inspect cooling."
                )
            )
        )

    new_alerts = []

    for alert in alerts:
        if alert_exists_recently(
            db=db,
            device_id=device.id,
            alert_type=alert.alert_type
        ):
            continue

        if alert.created_at is None:
            alert.created_at = local_now()

        db.add(alert)
        db.flush()

        new_alerts.append(alert)

        try:
            send_alert_email(alert=alert, device=device)
        except Exception as error:
            print(f"[Email Alerts] Failed to send alert email: {error}")

        try:
            send_alert_push_notifications(
                db=db,
                alert=alert,
                device=device
            )
        except Exception as error:
            print(f"[Push Notifications] Failed to send alert push: {error}")

    return new_alerts