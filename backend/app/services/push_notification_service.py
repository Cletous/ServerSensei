import requests
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.command import Command
from app.models.device import Device
from app.models.push_token import PushToken
from app.models.user import User
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

def should_send_push_for_alert(alert: Alert) -> bool:
    return alert.severity.lower() in ["warning", "critical"]

def build_push_title(alert: Alert) -> str:
    if alert.severity.lower() == "critical":
        return "ServerSensei Critical Alert"

    return "ServerSensei Warning Alert"

def send_push_notification_to_token(
    token: str,
    title: str,
    body: str,
    data: dict | None = None
) -> None:
    payload = {
        "to": token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
        "priority": "high",
        "channelId": "serversensei-alerts",
    }

    response = requests.post(EXPO_PUSH_URL, json=payload, timeout=10)

    if response.status_code >= 400:
        raise Exception(
            f"Expo push failed: {response.status_code} {response.text}"
        )

def get_active_push_tokens(db: Session) -> list[PushToken]:
    return db.query(PushToken).filter(
        PushToken.active == True
    ).all()


def get_active_admin_push_tokens(db: Session) -> list[PushToken]:
    return db.query(PushToken).join(
        User,
        PushToken.user_id == User.id
    ).filter(
        PushToken.active == True,
        User.active == True,
        User.role == "admin",
    ).all()

def send_alert_push_notifications(
    db: Session,
    alert: Alert,
    device: Device
) -> None:
    if not should_send_push_for_alert(alert):
        return

    push_tokens = get_active_push_tokens(db)

    title = build_push_title(alert)
    body = alert.message

    for push_token in push_tokens:
        try:
            send_push_notification_to_token(
                token=push_token.token,
                title=title,
                body=body,
                data={
                    "type": "alert",
                    "alert_id": alert.id,
                    "device_id": device.device_id,
                    "alert_type": alert.alert_type,
                    "severity": alert.severity,
                }
            )
        except Exception as error:
            print(f"[Push Notifications] Failed: {error}")

def send_approval_request_push_notifications(
    db: Session,
    command: Command,
    device: Device,
    requested_by: User
) -> None:
    push_tokens = get_active_admin_push_tokens(db)

    title = "ServerSensei Approval Required"
    body = (
        f"{requested_by.email} requested {command.action} "
        f"for {device.device_name}"
    )

    for push_token in push_tokens:
        try:
            send_push_notification_to_token(
                token=push_token.token,
                title=title,
                body=body,
                data={
                    "type": "command_approval",
                    "command_id": command.id,
                    "device_id": device.device_id,
                    "action": command.action,
                    "requested_by_user_id": requested_by.id,
                }
            )
        except Exception as error:
            print(f"[Approval Push Notifications] Failed: {error}")

def send_test_push_notification_to_user(
    db: Session,
    user: User
) -> int:
    push_tokens = db.query(PushToken).filter(
        PushToken.user_id == user.id,
        PushToken.active == True
    ).all()

    sent_count = 0

    for push_token in push_tokens:
        try:
            send_push_notification_to_token(
                token=push_token.token,
                title="ServerSensei Test Notification",
                body="Remote push notifications are working.",
                data={
                    "type": "test_notification",
                    "user_id": user.id,
                }
            )
            sent_count += 1
        except Exception as error:
            print(f"[Test Push Notifications] Failed: {error}")

    return sent_count