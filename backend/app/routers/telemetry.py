from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.device import Device
from app.models.device_status import DeviceStatus
from app.models.sensor_reading import SensorReading
from app.schemas.telemetry import TelemetryRequest, TelemetryResponse

router = APIRouter(
    prefix="/telemetry",
    tags=["Telemetry"]
)

@router.post("", response_model=TelemetryResponse)
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

    db.commit()

    return TelemetryResponse(
        message="Telemetry received successfully"
    )