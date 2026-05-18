from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.alert import Alert
from app.models.device import Device
from app.models.user import User
from app.schemas.alert import AlertResponse

router = APIRouter(
    tags=["Alerts"]
)

def build_alert_response(alert: Alert, device: Device) -> AlertResponse:
    return AlertResponse(
        id=alert.id,
        device_id=device.device_id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        message=alert.message,
        created_at=alert.created_at
    )

@router.get("/alerts", response_model=list[AlertResponse])
def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alerts = db.query(Alert).order_by(
        Alert.created_at.desc()
    ).limit(100).all()

    responses = []

    for alert in alerts:
        device = db.query(Device).filter(
            Device.id == alert.device_id
        ).first()

        if device:
            responses.append(build_alert_response(alert, device))

    return responses

@router.get("/devices/{device_id}/alerts", response_model=list[AlertResponse])
def get_device_alerts(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(
        Device.device_id == device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    alerts = db.query(Alert).filter(
        Alert.device_id == device.id
    ).order_by(
        Alert.created_at.desc()
    ).limit(100).all()

    return [
        build_alert_response(alert, device)
        for alert in alerts
    ]