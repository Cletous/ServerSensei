from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.device import Device
from app.models.device_status import DeviceStatus
from app.schemas.device import DeviceRegisterRequest, DeviceResponse


router = APIRouter(
    prefix="/devices",
    tags=["Devices"]
)


@router.post("/register", response_model=DeviceResponse)
def register_device(
    request: DeviceRegisterRequest,
    db: Session = Depends(get_db)
):
    existing_device = db.query(Device).filter(
        Device.device_id == request.device_id
    ).first()

    if existing_device:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device already registered"
        )

    device = Device(
        device_id=request.device_id,
        device_name=request.device_name,
        location=request.location,
        mode="monitor",
        online=False
    )

    db.add(device)
    db.commit()
    db.refresh(device)

    device_status = DeviceStatus(
        device_id=device.id,
        wifi_status="unknown",
        mode="monitor",
        uptime=0
    )

    db.add(device_status)
    db.commit()

    return device

@router.get("", response_model=list[DeviceResponse])
def get_devices(
    db: Session = Depends(get_db)
):
    devices = db.query(Device).all()
    return devices

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(
    device_id: str,
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(
        Device.device_id == device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    return device