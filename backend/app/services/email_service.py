from datetime import datetime
from email.message import EmailMessage
from email.utils import formataddr
import smtplib
import ssl

from app.core.config import settings
from app.models.alert import Alert
from app.models.device import Device


SEVERITY_RANK = {
    "info": 1,
    "warning": 2,
    "critical": 3,
}


def get_alert_recipients() -> list[str]:
    if not settings.ALERT_RECIPIENT_EMAILS:
        return []

    return [
        email.strip()
        for email in settings.ALERT_RECIPIENT_EMAILS.split(",")
        if email.strip()
    ]


def should_send_email_for_alert(alert: Alert) -> bool:
    if not settings.EMAIL_ALERTS_ENABLED:
        return False

    recipients = get_alert_recipients()

    if not recipients:
        return False

    minimum_rank = SEVERITY_RANK.get(
        settings.EMAIL_ALERT_MIN_SEVERITY.lower(),
        2
    )

    alert_rank = SEVERITY_RANK.get(alert.severity.lower(), 0)

    return alert_rank >= minimum_rank


def format_alert_time(value: datetime | None) -> str:
    if value is None:
        return "Unknown time"

    weekday = value.strftime("%a")
    day = value.day
    month = value.strftime("%b")
    year = value.year
    time = value.strftime("%H:%M")

    return f"{weekday}, {day} {month} {year} @ {time}"


def build_alert_email_body(alert: Alert, device: Device) -> str:
    return f"""ServerSensei Alert Notification

Device: {device.device_name}
Device ID: {device.device_id}
Location: {device.location or "Not specified"}

Alert Type: {alert.alert_type}
Severity: {alert.severity.upper()}
Message: {alert.message}

Time: {format_alert_time(alert.created_at)}

Recommended Action:
Please check the ServerSensei mobile dashboard and inspect the server room conditions if necessary.

This is an automated alert from ServerSensei.
"""


def get_from_address() -> str:
    from_email = settings.MAIL_FROM_ADDRESS or settings.MAIL_USERNAME
    from_name = settings.MAIL_FROM_NAME or "ServerSensei"

    return formataddr((from_name, from_email))


def send_alert_email(alert: Alert, device: Device) -> None:
    if not should_send_email_for_alert(alert):
        return

    recipients = get_alert_recipients()

    message = EmailMessage()
    message["Subject"] = (
        f"ServerSensei {alert.severity.upper()} Alert - {alert.alert_type}"
    )
    message["From"] = get_from_address()
    message["To"] = ", ".join(recipients)

    message.set_content(build_alert_email_body(alert, device))

    context = ssl.create_default_context()
    encryption = settings.MAIL_ENCRYPTION.lower().strip()

    if encryption == "ssl":
        with smtplib.SMTP_SSL(
            settings.MAIL_HOST,
            settings.MAIL_PORT,
            context=context
        ) as server:
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.send_message(message)

        return

    with smtplib.SMTP(settings.MAIL_HOST, settings.MAIL_PORT) as server:
        if encryption in ["tls", "starttls"]:
            server.starttls(context=context)

        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.send_message(message)