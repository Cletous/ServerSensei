from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.alert import Alert
from app.models.device import Device
from app.models.device_status import DeviceStatus

OFFLINE_THRESHOLD_SECONDS = 30

def update_device_online_states(db: Session):
    now = datetime.now()
    offline_cutoff = now - timedelta(seconds=OFFLINE_THRESHOLD_SECONDS)

    statuses = db.query(DeviceStatus).all()

    for status in statuses:
        device = db.query(Device).filter(
            Device.id == status.device_id
        ).first()

        if not device:
            continue

        if status.last_seen < offline_cutoff:
            if device.online:
                device.online = False

                db.add(
                    Alert(
                        device_id=device.id,
                        alert_type="DEVICE_OFFLINE",
                        severity="critical",
                        message=f"Device {device.device_id} appears to be offline"
                    )
                )
        else:
            device.online = True

    db.commit()