import asyncio
import logging

from ..config import settings
from ..content.sync import sync_catalog, sync_reference_data
from .legacy import LegacyReport, absorb_legacy_data
from .migrate import migrate
from .session import SessionLocal

log = logging.getLogger(__name__)


async def initialise_database() -> LegacyReport | None:
    applied = await asyncio.to_thread(migrate, settings.DATABASE_URL, settings.BACKUP_BEFORE_MIGRATE)
    if applied:
        log.info('Applied database migrations: %s', applied)
    async with SessionLocal() as session:
        await sync_catalog(session)
        await sync_reference_data(session)
        report = await absorb_legacy_data(session)
        await session.commit()
    return report
