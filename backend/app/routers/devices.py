from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.device import Device
from app.models.device_status import DeviceStatus
from app.models.user import User
from app.schemas.device import (
    DeviceRegisterRequest,
    DeviceResponse,
    DeviceStatusResponse,
)
from app.services.device_monitoring_service import update_device_online_states

router = APIRouter(
    prefix="/devices",
    tags=["Devices"]
)

@router.post("/register", response_model=DeviceResponse)
def register_device(
    request: DeviceRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    update_device_online_states(db)
    
    devices = db.query(Device).all()
    return devices

@router.get("/{device_id}/status", response_model=DeviceStatusResponse)
def get_device_status(
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

    device_status = db.query(DeviceStatus).filter(
        DeviceStatus.device_id == device.id
    ).first()

    if not device_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device status not found"
        )

    return DeviceStatusResponse(
        device_id=device.device_id,
        device_name=device.device_name,
        location=device.location,
        mode=device.mode,
        online=device.online,
        wifi_status=device_status.wifi_status,
        uptime=device_status.uptime,
        last_seen=device_status.last_seen
    )

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(
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

    return device