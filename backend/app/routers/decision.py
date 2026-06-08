from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.alert import Alert
from app.models.device import Device
from app.models.power_status import PowerStatus
from app.models.sensor_reading import SensorReading
from app.models.user import User
from app.schemas.decision import (
    DecisionEvaluationResponse,
    RecentAlertSummary,
)
from app.services.device_monitoring_service import update_device_online_states
from app.services.power_prediction_service import estimate_ups_runtime_minutes

router = APIRouter(
    tags=["Decision Evaluation"]
)


def get_highest_severity(alerts: list[Alert]) -> str | None:
    if not alerts:
        return None

    severity_rank = {
        "info": 1,
        "warning": 2,
        "critical": 3,
    }

    highest = max(
        alerts,
        key=lambda alert: severity_rank.get(alert.severity, 0)
    )

    return highest.severity


def build_evaluation_summary(
    environmental_risk: str | None,
    power_source: str | None,
    estimated_runtime_minutes: float | None,
    recent_alerts: list[Alert]
) -> str:
    if environmental_risk == "critical":
        return "Critical decision state detected. Immediate inspection and load protection are recommended."

    if power_source == "ups" and environmental_risk in ["high", "critical"]:
        return "Combined power and environmental risk detected. Preserve critical services and inspect cooling."

    if power_source == "ups":
        if estimated_runtime_minutes is not None:
            return f"Device is running on UPS. Estimated runtime is {estimated_runtime_minutes} minutes."
        return "Device is running on UPS. Runtime estimate is currently unavailable."

    if environmental_risk == "high":
        return "High environmental risk detected. Cooling and air quality should be checked."

    if environmental_risk == "warning":
        return "Environmental warning detected. Continue monitoring and prepare corrective action if conditions worsen."

    if recent_alerts:
        return "Recent alerts exist, but the latest decision state is not critical."

    return "System is currently stable based on latest telemetry and decision data."


@router.get(
    "/devices/{device_id}/decision/evaluation",
    response_model=DecisionEvaluationResponse
)
def get_device_decision_evaluation(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    update_device_online_states(db)

    device = db.query(Device).filter(
        Device.device_id == device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    latest_reading = db.query(SensorReading).filter(
        SensorReading.device_id == device.id
    ).order_by(
        SensorReading.created_at.desc()
    ).first()

    power_status = db.query(PowerStatus).filter(
        PowerStatus.device_id == device.id
    ).first()

    recent_cutoff = datetime.now() - timedelta(minutes=10)

    recent_alerts = db.query(Alert).filter(
        Alert.device_id == device.id,
        Alert.created_at >= recent_cutoff
    ).order_by(
        Alert.created_at.desc()
    ).limit(10).all()

    estimated_runtime_minutes = None

    if power_status:
        estimated_runtime_minutes = estimate_ups_runtime_minutes(
            power_source=power_status.power_source,
            battery_percent=power_status.battery_percent,
            load_percent=power_status.load_percent
        )

    environmental_risk = (
        latest_reading.environmental_risk
        if latest_reading
        else None
    )

    power_source = (
        power_status.power_source
        if power_status
        else None
    )

    evaluation_summary = build_evaluation_summary(
        environmental_risk=environmental_risk,
        power_source=power_source,
        estimated_runtime_minutes=estimated_runtime_minutes,
        recent_alerts=recent_alerts
    )

    return DecisionEvaluationResponse(
        device_id=device.device_id,
        device_name=device.device_name,
        mode=device.mode,
        online=device.online,

        temperature=latest_reading.temperature if latest_reading else None,
        humidity=latest_reading.humidity if latest_reading else None,
        air_quality_raw=latest_reading.air_quality_raw if latest_reading else None,
        air_quality_status=latest_reading.air_quality_status if latest_reading else None,

        power_source=power_status.power_source if power_status else None,
        battery_percent=power_status.battery_percent if power_status else None,
        load_percent=power_status.load_percent if power_status else None,
        estimated_runtime_minutes=estimated_runtime_minutes,

        environmental_risk=environmental_risk,
        system_recommendation=(
            latest_reading.system_recommendation
            if latest_reading
            else None
        ),

        alert_count_recent=len(recent_alerts),
        highest_recent_severity=get_highest_severity(recent_alerts),
        recent_alerts=[
            RecentAlertSummary(
                alert_type=alert.alert_type,
                severity=alert.severity,
                message=alert.message,
                created_at=alert.created_at
            )
            for alert in recent_alerts
        ],

        evaluation_summary=evaluation_summary,
        latest_telemetry_at=latest_reading.created_at if latest_reading else None,
        power_updated_at=power_status.updated_at if power_status else None
    )