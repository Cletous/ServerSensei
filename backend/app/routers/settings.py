from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.device import Device
from app.models.device_setting import DeviceSetting
from app.models.user import User
from app.schemas.device_setting import (
    DeviceSettingResponse,
    DeviceSettingUpdateRequest,
)

router = APIRouter(
    tags=["Settings"]
)


def get_or_create_device_settings(db: Session, device: Device) -> DeviceSetting:
    settings = db.query(DeviceSetting).filter(
        DeviceSetting.device_id == device.id
    ).first()

    if settings:
        return settings

    settings = DeviceSetting(device_id=device.id)

    db.add(settings)
    db.commit()
    db.refresh(settings)

    return settings


def build_settings_response(
    device: Device,
    settings: DeviceSetting
) -> DeviceSettingResponse:
    return DeviceSettingResponse(
        device_id=device.device_id,
        fan_on_temperature=settings.fan_on_temperature,
        fan_off_temperature=settings.fan_off_temperature,
        low_runtime_threshold_minutes=settings.low_runtime_threshold_minutes,
        critical_runtime_threshold_minutes=settings.critical_runtime_threshold_minutes,
        demo_ups_full_drain_seconds_at_100_load=settings.demo_ups_full_drain_seconds_at_100_load,
        demo_battery_recovery_percent_per_second=settings.demo_battery_recovery_percent_per_second,
        demo_restart_battery_percent=settings.demo_restart_battery_percent,
        settings_version=settings.settings_version,
        updated_at=settings.updated_at
    )


@router.get(
    "/devices/{device_id}/settings/runtime",
    response_model=DeviceSettingResponse
)
def get_device_runtime_settings(
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

    settings = get_or_create_device_settings(db, device)

    return build_settings_response(device, settings)


@router.put(
    "/devices/{device_id}/settings",
    response_model=DeviceSettingResponse
)
def update_device_settings(
    device_id: str,
    request: DeviceSettingUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    device = db.query(Device).filter(
        Device.device_id == device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    settings = get_or_create_device_settings(db, device)

    update_data = request.model_dump(exclude_unset=True)

    for field_name, value in update_data.items():
        if value is not None:
            setattr(settings, field_name, value)

    if settings.fan_off_temperature >= settings.fan_on_temperature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fan_off_temperature must be lower than fan_on_temperature"
        )

    if settings.critical_runtime_threshold_minutes >= settings.low_runtime_threshold_minutes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="critical_runtime_threshold_minutes must be lower than low_runtime_threshold_minutes"
        )

    settings.settings_version += 1

    db.commit()
    db.refresh(settings)

    return build_settings_response(device, settings)