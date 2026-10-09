from datetime import date, datetime, timezone
from functools import lru_cache
from zoneinfo import ZoneInfo

from ..config import settings


@lru_cache(maxsize=1)
def _zone() -> ZoneInfo | None:
    return ZoneInfo(settings.TIMEZONE) if settings.TIMEZONE else None


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def today() -> date:
    zone = _zone()
    return datetime.now(zone).date() if zone else datetime.now().date()
