import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from types import ModuleType

from sqlalchemy.engine import make_url

from .migrations import m001_initial

log = logging.getLogger(__name__)

MIGRATIONS: tuple[ModuleType, ...] = (m001_initial,)
LATEST_VERSION = MIGRATIONS[-1].VERSION


class MigrationError(RuntimeError):
    pass


def database_path(url: str) -> Path | None:
    parsed = make_url(url)
    if not parsed.drivername.startswith('sqlite'):
        raise MigrationError(f'Unsupported database backend: {parsed.drivername}')
    if not parsed.database or parsed.database == ':memory:':
        return None
    return Path(parsed.database).resolve()


def user_tables(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    ).fetchall()
    return [row[0] for row in rows]


def write_backup(conn: sqlite3.Connection, path: Path, version: int) -> Path:
    stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    target = path.with_name(f'{path.name}.pre-v{version + 1}-{stamp}.bak')
    destination = sqlite3.connect(target)
    try:
        conn.backup(destination)
    finally:
        destination.close()
    return target


def migrate(url: str, backup: bool = True) -> list[int]:
    path = database_path(url)
    if path is None:
        return []
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, isolation_level=None, timeout=15)
    applied: list[int] = []
    try:
        current = conn.execute('PRAGMA user_version').fetchone()[0]
        pending = [m for m in MIGRATIONS if m.VERSION > current]
        if not pending:
            return applied
        if backup and user_tables(conn):
            saved = write_backup(conn, path, current)
            log.info('Database backed up to %s before migrating', saved)
        for migration in pending:
            conn.execute('PRAGMA foreign_keys=OFF')
            conn.execute('BEGIN IMMEDIATE')
            try:
                migration.apply(conn)
                broken = conn.execute('PRAGMA foreign_key_check').fetchall()
                violations = [row for row in broken if not str(row[0]).startswith('legacy_')]
                if violations:
                    raise MigrationError(f'Foreign key violations after migration {migration.VERSION}: {violations[:5]}')
                conn.execute(f'PRAGMA user_version={int(migration.VERSION)}')
                conn.execute('COMMIT')
            except BaseException:
                conn.execute('ROLLBACK')
                raise
            finally:
                conn.execute('PRAGMA foreign_keys=ON')
            applied.append(migration.VERSION)
    finally:
        conn.close()
    return applied
