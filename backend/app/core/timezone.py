from datetime import datetime
from zoneinfo import ZoneInfo
from app.core.config import settings

APP_TIMEZONE = ZoneInfo(settings.APP_TIMEZONE)

def local_now() -> datetime:
    """
    Returns Africa/Harare local time as a naive datetime.

    MySQL DATETIME columns usually store naive datetime values, so this keeps
    the whole demo system consistent as GMT+2 local time.
    """
    return datetime.now(APP_TIMEZONE).replace(tzinfo=None)