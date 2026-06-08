from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.alert import Alert
from app.models.device import Device
from app.models.power_status import PowerStatus
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
        humidity=request.humidity,
        air_quality_raw=request.air_quality_raw,
        air_quality_status=request.air_quality_status,
        environmental_risk=request.environmental_risk,
        system_recommendation=request.system_recommendation
    )

    db.add(sensor_reading)

    was_online = device.online

    device.online = True
    device.mode = request.mode

    if was_online is False:
        db.add(
            Alert(
                device_id=device.id,
                alert_type="DEVICE_ONLINE",
                severity="info",
                message=f"Device {device.device_id} is back online"
            )
        )

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

    if (
        request.power_source is not None or
        request.battery_percent is not None or
        request.load_percent is not None
    ):
        power_status = db.query(PowerStatus).filter(
            PowerStatus.device_id == device.id
        ).first()

        if power_status:
            if request.power_source is not None:
                power_status.power_source = request.power_source

            if request.battery_percent is not None:
                power_status.battery_percent = request.battery_percent

            if request.load_percent is not None:
                power_status.load_percent = request.load_percent
        else:
            power_status = PowerStatus(
                device_id=device.id,
                power_source=request.power_source or "unknown",
                battery_percent=request.battery_percent,
                load_percent=request.load_percent
            )

            db.add(power_status)

    check_telemetry_alerts(
        db=db,
        device=device,
        temperature=request.temperature,
        humidity=request.humidity,
        power_source=request.power_source,
        battery_percent=request.battery_percent,
        load_percent=request.load_percent,
        air_quality_raw=request.air_quality_raw,
        air_quality_status=request.air_quality_status
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