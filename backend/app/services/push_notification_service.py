import requests

from app.models.alert import Alert
from app.models.device import Device
from app.models.push_token import PushToken

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

def send_alert_push_notifications(
    db,
    alert: Alert,
    device: Device
) -> None:
    if not should_send_push_for_alert(alert):
        return

    push_tokens = db.query(PushToken).filter(
        PushToken.active == True
    ).all()

    title = build_push_title(alert)
    body = alert.message

    for push_token in push_tokens:
        try:
            send_push_notification_to_token(
                token=push_token.token,
                title=title,
                body=body,
                data={
                    "alert_id": alert.id,
                    "device_id": device.device_id,
                    "alert_type": alert.alert_type,
                    "severity": alert.severity,
                }
            )
        except Exception as error:
            print(f"[Push Notifications] Failed: {error}")