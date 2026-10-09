from collections.abc import AsyncIterator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from ..config import settings


def build_engine(url: str) -> AsyncEngine:
    engine = create_async_engine(url, connect_args={'timeout': 15})

    @event.listens_for(engine.sync_engine, 'connect')
    def configure_connection(dbapi_connection, _record):
        dbapi_connection.isolation_level = None
        cursor = dbapi_connection.cursor()
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.execute('PRAGMA journal_mode=WAL')
        cursor.execute('PRAGMA synchronous=NORMAL')
        cursor.execute('PRAGMA busy_timeout=15000')
        cursor.close()

    @event.listens_for(engine.sync_engine, 'begin')
    def begin_immediate(connection):
        connection.exec_driver_sql('BEGIN IMMEDIATE')

    return engine


engine = build_engine(settings.DATABASE_URL)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
