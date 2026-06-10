from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.device import Device
from app.models.power_status import PowerStatus
from app.models.user import User
from app.schemas.power import PowerStatusResponse
from app.services.power_prediction_service import estimate_ups_runtime_minutes
from app.services.device_monitoring_service import update_device_online_states

router = APIRouter(
    tags=["Power"]
)

@router.get("/devices/{device_id}/power", response_model=PowerStatusResponse)
def get_device_power_status(
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

    power_status = db.query(PowerStatus).filter(
        PowerStatus.device_id == device.id
    ).first()

    if not power_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Power status not found for this device"
        )

    if device.online is False:
        return PowerStatusResponse(
            device_id=device.device_id,
            power_source="offline",
            battery_percent=0,
            load_percent=0,
            estimated_runtime_minutes=0,
            updated_at=power_status.updated_at
        )

    estimated_runtime_minutes = estimate_ups_runtime_minutes(
        power_source=power_status.power_source,
        battery_percent=power_status.battery_percent,
        load_percent=power_status.load_percent
    )

    return PowerStatusResponse(
        device_id=device.device_id,
        power_source=power_status.power_source,
        battery_percent=power_status.battery_percent,
        load_percent=power_status.load_percent,
        estimated_runtime_minutes=estimated_runtime_minutes,
        updated_at=power_status.updated_at
    )