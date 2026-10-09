import asyncio
import sqlite3
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.content.sync import sync_catalog, sync_reference_data
from app.db.base import Base
from app.db.legacy import absorb_legacy_data, canonical_lesson_id
from app.db.migrate import LATEST_VERSION, migrate
from app.db.session import build_engine
from app.models import Learner, LearnerAchievement, LessonProgress

LEGACY_SCHEMA = (
    """CREATE TABLE users (id VARCHAR NOT NULL, name VARCHAR NOT NULL, avatar VARCHAR NOT NULL, created_at DATETIME NOT NULL,
    xp INTEGER NOT NULL, streak INTEGER NOT NULL, last_active VARCHAR, hearts INTEGER NOT NULL, max_hearts INTEGER NOT NULL,
    hearts_regen_at DATETIME, gems INTEGER NOT NULL, daily_goal INTEGER NOT NULL, daily_xp INTEGER NOT NULL,
    daily_xp_date VARCHAR NOT NULL, language VARCHAR NOT NULL, theme VARCHAR NOT NULL, email VARCHAR,
    native_language VARCHAR DEFAULT 'English', target_language VARCHAR DEFAULT 'Spanish', proficiency_level VARCHAR,
    proficiency VARCHAR(50), PRIMARY KEY (id))""",
    'CREATE TABLE units (id VARCHAR NOT NULL, section INTEGER NOT NULL, title VARCHAR NOT NULL, subtitle VARCHAR NOT NULL, color VARCHAR NOT NULL, color_dark VARCHAR NOT NULL, order_index INTEGER NOT NULL, PRIMARY KEY (id))',
    'CREATE TABLE skills (id VARCHAR NOT NULL, unit_id VARCHAR NOT NULL, title VARCHAR NOT NULL, icon VARCHAR NOT NULL, description VARCHAR NOT NULL, order_index INTEGER NOT NULL, PRIMARY KEY (id), FOREIGN KEY(unit_id) REFERENCES units (id))',
    'CREATE TABLE lessons (id VARCHAR NOT NULL, skill_id VARCHAR NOT NULL, title VARCHAR NOT NULL, order_index INTEGER NOT NULL, PRIMARY KEY (id), FOREIGN KEY(skill_id) REFERENCES skills (id))',
    'CREATE TABLE exercises (id VARCHAR NOT NULL, lesson_id VARCHAR NOT NULL, type VARCHAR NOT NULL, order_index INTEGER NOT NULL, payload JSON NOT NULL, PRIMARY KEY (id), FOREIGN KEY(lesson_id) REFERENCES lessons (id))',
    'CREATE TABLE achievements (id VARCHAR NOT NULL, title VARCHAR NOT NULL, description VARCHAR NOT NULL, icon VARCHAR NOT NULL, color VARCHAR NOT NULL, rule_type VARCHAR NOT NULL, rule_value INTEGER NOT NULL, PRIMARY KEY (id))',
    'CREATE TABLE leaderboard_seed (id VARCHAR NOT NULL, name VARCHAR NOT NULL, avatar VARCHAR NOT NULL, xp INTEGER NOT NULL, PRIMARY KEY (id))',
    'CREATE TABLE user_skill_progress (user_id VARCHAR NOT NULL, skill_id VARCHAR NOT NULL, crowns INTEGER NOT NULL, lessons_completed INTEGER NOT NULL, PRIMARY KEY (user_id, skill_id), FOREIGN KEY(user_id) REFERENCES users (id), FOREIGN KEY(skill_id) REFERENCES skills (id))',
    'CREATE TABLE user_lesson_progress (user_id VARCHAR NOT NULL, lesson_id VARCHAR NOT NULL, completed BOOLEAN NOT NULL, mistakes INTEGER NOT NULL, time_sec INTEGER NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY (user_id, lesson_id), FOREIGN KEY(user_id) REFERENCES users (id), FOREIGN KEY(lesson_id) REFERENCES lessons (id))',
    'CREATE TABLE user_achievements (user_id VARCHAR NOT NULL, achievement_id VARCHAR NOT NULL, unlocked_at DATETIME NOT NULL, PRIMARY KEY (user_id, achievement_id), FOREIGN KEY(user_id) REFERENCES users (id), FOREIGN KEY(achievement_id) REFERENCES achievements (id))',
)

LESSON_ROWS = (
    ('l1', 1, 1, 37, '2026-10-08 14:17:46'),
    ('l2', 1, 2, 46, '2026-10-08 16:39:37'),
    ('l3', 1, 2, 30, '2026-10-08 20:27:42'),
    ('l4', 1, 3, 16, '2026-10-08 20:28:01'),
    ('hi-l1', 1, 0, 22, '2026-10-08 20:45:53'),
    ('hi-s1-l2', 1, 2, 42, '2026-10-08 22:10:12'),
)


def build_legacy_database(path: Path, extra_lessons: tuple = ()) -> None:
    connection = sqlite3.connect(path)
    for statement in LEGACY_SCHEMA:
        connection.execute(statement)
    connection.execute(
        "INSERT INTO users VALUES ('default-user', 'one', 'avatar-sky', '2026-10-08 14:16:19.973113', 73, 2, '2026-10-09', 5, 5, NULL, 185, 20, 49, '2026-10-09', 'french', 'light', 'One@Gmail.com', 'English', 'French', 'Advanced', NULL)"
    )
    connection.executemany(
        "INSERT INTO user_lesson_progress VALUES ('default-user', ?, ?, ?, ?, ?)",
        [row for row in (*LESSON_ROWS, *extra_lessons)],
    )
    connection.executemany(
        "INSERT INTO user_skill_progress VALUES ('default-user', ?, 1, 2)", [('s1',), ('s2',), ('hi-s1',)]
    )
    connection.execute("INSERT INTO achievements VALUES ('first', 'First', 'x', 'i', '#fff', 'lessons', 1)")
    connection.execute("INSERT INTO user_achievements VALUES ('default-user', 'first', '2026-10-08 14:17:46')")
    connection.commit()
    connection.close()


async def upgrade(path: Path, backup: bool = False):
    url = f"sqlite+aiosqlite:///{path.as_posix()}"
    migrate(url, backup=backup)
    engine = build_engine(url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as session:
            await sync_catalog(session)
            await sync_reference_data(session)
            report = await absorb_legacy_data(session)
            await session.commit()
        async with factory() as session:
            learners = (await session.scalars(select(Learner))).all()
            progress = {row.lesson_id: row for row in (await session.scalars(select(LessonProgress))).all()}
            unlocked = [row.achievement_id for row in (await session.scalars(select(LearnerAchievement))).all()]
        return report, learners, progress, unlocked
    finally:
        await engine.dispose()


def table_names(path: Path) -> set[str]:
    with sqlite3.connect(path) as connection:
        return {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}


def test_legacy_database_is_upgraded_without_losing_progress(tmp_path):
    path = tmp_path / 'legacy.db'
    build_legacy_database(path)
    report, learners, progress, unlocked = asyncio.run(upgrade(path, backup=True))

    assert (report.learners, report.lessons, report.achievements, report.unmapped) == (1, 6, 1, 0)
    (learner,) = learners
    assert learner.id == 'default-user' and learner.email == 'one@gmail.com'
    assert learner.course_code == 'fr' and learner.proficiency == 'Advanced' and learner.display_name == 'one'
    assert (learner.stats.xp, learner.stats.gems, learner.stats.streak, learner.stats.hearts) == (73, 185, 2, 5)

    assert set(progress) == {'es-s1-l1', 'es-s1-l2', 'es-s2-l1', 'es-s2-l2', 'hi-s1-l1', 'hi-s1-l2'}
    assert progress['es-s1-l2'].best_mistakes == 2 and progress['hi-s1-l1'].best_mistakes == 0
    assert progress['es-s2-l2'].last_time_sec == 16
    assert unlocked == ['first']

    assert not any(name.startswith('legacy_') for name in table_names(path))
    assert list(tmp_path.glob('legacy.db.pre-v1-*.bak'))
    with sqlite3.connect(next(tmp_path.glob('legacy.db.pre-v1-*.bak'))) as backup:
        assert backup.execute('SELECT COUNT(*) FROM user_lesson_progress').fetchone()[0] == 6
    with sqlite3.connect(path) as connection:
        assert connection.execute('PRAGMA user_version').fetchone()[0] == LATEST_VERSION
        assert connection.execute('PRAGMA foreign_key_check').fetchall() == []


def test_upgrade_is_idempotent(tmp_path):
    path = tmp_path / 'legacy.db'
    build_legacy_database(path)
    asyncio.run(upgrade(path))
    report, learners, progress, _ = asyncio.run(upgrade(path))
    assert report is None and len(learners) == 1 and len(progress) == 6
    assert migrate(f"sqlite+aiosqlite:///{path.as_posix()}") == []


def test_unmappable_legacy_rows_keep_the_legacy_tables(tmp_path):
    path = tmp_path / 'legacy.db'
    build_legacy_database(path, extra_lessons=(('zz-l9', 1, 0, 5, '2026-10-08 22:10:12'),))
    report, learners, progress, _ = asyncio.run(upgrade(path))
    assert report.unmapped == 1 and len(progress) == 6
    assert 'legacy_user_lesson_progress' in table_names(path)
    with sqlite3.connect(path) as connection:
        assert connection.execute('SELECT COUNT(*) FROM legacy_user_lesson_progress').fetchone()[0] == 7


def test_fresh_database_gets_the_full_schema_and_catalogue(tmp_path):
    path = tmp_path / 'fresh.db'
    report, learners, progress, unlocked = asyncio.run(upgrade(path))
    assert report is None and learners == [] and progress == {} and unlocked == []
    with sqlite3.connect(path) as connection:
        assert connection.execute('SELECT COUNT(*) FROM exercises').fetchone()[0] == 120
        assert connection.execute('SELECT COUNT(*) FROM lessons WHERE playable = 1').fetchone()[0] == 12
        assert connection.execute('SELECT COUNT(*) FROM courses').fetchone()[0] == 3
        assert connection.execute('SELECT COUNT(*) FROM rivals').fetchone()[0] == 10


def test_catalogue_sync_is_idempotent_and_keeps_history(tmp_path):
    path = tmp_path / 'fresh.db'
    asyncio.run(upgrade(path))
    with sqlite3.connect(path) as connection:
        connection.execute("UPDATE exercises SET spec = '{}' WHERE id = 'es-s1-l1-e1'")
        connection.execute("UPDATE lessons SET title = 'Edited' WHERE id = 'es-s1-l1'")
    asyncio.run(upgrade(path))
    with sqlite3.connect(path) as connection:
        assert connection.execute("SELECT title FROM lessons WHERE id = 'es-s1-l1'").fetchone()[0] == 'Level 1'
        assert 'prompt' in connection.execute("SELECT spec FROM exercises WHERE id = 'es-s1-l1-e1'").fetchone()[0]
        assert connection.execute('SELECT COUNT(*) FROM exercises').fetchone()[0] == 120


def test_orm_models_match_the_migrated_schema(tmp_path):
    path = tmp_path / 'fresh.db'
    asyncio.run(upgrade(path))
    with sqlite3.connect(path) as connection:
        for table in Base.metadata.sorted_tables:
            columns = {row[1]: row for row in connection.execute(f'PRAGMA table_info({table.name})')}
            assert set(columns) == {column.name for column in table.columns}, table.name
            for column in table.columns:
                declared = columns[column.name]
                if not column.primary_key:
                    assert bool(declared[3]) == (not column.nullable), f'{table.name}.{column.name}'


@pytest.mark.parametrize(
    'raw,expected',
    [
        ('l1', 'es-s1-l1'),
        ('l2', 'es-s1-l2'),
        ('l3', 'es-s2-l1'),
        ('l4', 'es-s2-l2'),
        ('hi-l1', 'hi-s1-l1'),
        ('fr-l4', 'fr-s2-l2'),
        ('hi-s1-l2', 'hi-s1-l2'),
        ('s2-l1', 'es-s2-l1'),
        ('l99', None),
        ('nonsense', None),
    ],
)
def test_legacy_lesson_ids_map_onto_current_content(raw, expected):
    known = {f'{code}-s{skill}-l{level}' for code in ('es', 'fr', 'hi') for skill in (1, 2) for level in (1, 2, 3, 4)}
    assert canonical_lesson_id(raw, known) == expected
