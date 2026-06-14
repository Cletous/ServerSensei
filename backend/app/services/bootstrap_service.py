# app/services/bootstrap_service.py

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.device import Device
from app.models.device_status import DeviceStatus
from app.models.device_setting import DeviceSetting
from app.models.user import User

DEFAULT_DEVICE_ID = "serversensei-esp32-001"
DEFAULT_DEVICE_NAME = "ServerSensei"
DEFAULT_DEVICE_LOCATION = "Server Room A"
DEFAULT_DEVICE_MODE = "automatic"

DEFAULT_PASSWORD = "Pass@123"

SEEDED_USERS = [
    ("Admin Cee", "admin@test.com", "admin"),
    ("Operator Dee", "operator@test.com", "operator"),
    ("Viewer Gee", "viewer@test.com", "viewer"),
]


def seed_system_defaults(db: Session) -> None:
    device = db.query(Device).filter(
        Device.device_id == DEFAULT_DEVICE_ID
    ).first()

    if not device:
        device = Device(
            device_id=DEFAULT_DEVICE_ID,
            device_name=DEFAULT_DEVICE_NAME,
            location=DEFAULT_DEVICE_LOCATION,
            mode=DEFAULT_DEVICE_MODE,
            online=False,
        )

        db.add(device)
        db.flush()

        db.add(
            DeviceStatus(
                device_id=device.id,
                wifi_status="unknown",
                mode=DEFAULT_DEVICE_MODE,
                uptime=0,
            )
        )

        db.add(DeviceSetting(device_id=device.id))
    else:
        device.device_name = DEFAULT_DEVICE_NAME
        device.location = DEFAULT_DEVICE_LOCATION
        device.mode = DEFAULT_DEVICE_MODE

        device_status = db.query(DeviceStatus).filter(
            DeviceStatus.device_id == device.id
        ).first()

        if not device_status:
            db.add(
                DeviceStatus(
                    device_id=device.id,
                    wifi_status="unknown",
                    mode=DEFAULT_DEVICE_MODE,
                    uptime=0,
                )
            )
        else:
            device_status.mode = DEFAULT_DEVICE_MODE

        device_settings = db.query(DeviceSetting).filter(
            DeviceSetting.device_id == device.id
        ).first()

        if not device_settings:
            db.add(DeviceSetting(device_id=device.id))

    for name, email, role in SEEDED_USERS:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            db.add(
                User(
                    name=name,
                    email=email,
                    password_hash=hash_password(DEFAULT_PASSWORD),
                    role=role,
                    active=True,
                )
            )
        else:
            user.role = role
            user.active = True

    db.commit()