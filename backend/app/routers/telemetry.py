from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.device_status import DeviceStatus
from app.models.user import User
from app.schemas.telemetry import (
    TelemetryReadingResponse,
    TelemetryRequest,
    TelemetryResponse,
)
from app.services.alert_service import check_telemetry_alerts

router = APIRouter(
    tags=["Telemetry"]
)

@router.post("/telemetry", response_model=TelemetryResponse)
def receive_telemetry(
    request: TelemetryRequest,
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(
        Device.device_id == request.device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not registered"
        )

    sensor_reading = SensorReading(
        device_id=device.id,
        temperature=request.temperature,
        humidity=request.humidity
    )

    db.add(sensor_reading)

    device.online = True
    device.mode = request.mode

    device_status = db.query(DeviceStatus).filter(
        DeviceStatus.device_id == device.id
    ).first()

    if device_status:
        device_status.wifi_status = request.wifi
        device_status.mode = request.mode
        device_status.uptime = request.uptime
    else:
        device_status = DeviceStatus(
            device_id=device.id,
            wifi_status=request.wifi,
            mode=request.mode,
            uptime=request.uptime
        )
        db.add(device_status)

    check_telemetry_alerts(
        db=db,
        device=device,
        temperature=request.temperature,
        humidity=request.humidity
    )

    db.commit()

    return TelemetryResponse(
        message="Telemetry received successfully"
    )

@router.get(
    "/devices/{device_id}/telemetry/latest",
    response_model=TelemetryReadingResponse
)
def get_latest_telemetry(
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

    latest_reading = db.query(SensorReading).filter(
        SensorReading.device_id == device.id
    ).order_by(
        SensorReading.created_at.desc()
    ).first()

    if not latest_reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No telemetry found for this device"
        )

    return latest_reading

@router.get(
    "/devices/{device_id}/telemetry/history",
    response_model=list[TelemetryReadingResponse]
)
def get_telemetry_history(
    device_id: str,
    limit: int = Query(default=50, ge=1, le=500),
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

    readings = db.query(SensorReading).filter(
        SensorReading.device_id == device.id
    ).order_by(
        SensorReading.created_at.desc()
    ).limit(limit).all()

    return readings