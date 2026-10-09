import sqlite3

VERSION = 1

LEGACY_TABLES = (
    'user_achievements',
    'user_lesson_progress',
    'user_skill_progress',
    'exercises',
    'lessons',
    'skills',
    'units',
    'achievements',
    'leaderboard_seed',
    'users',
)

SCHEMA = (
    """
    CREATE TABLE courses (
        code VARCHAR NOT NULL PRIMARY KEY,
        name VARCHAR NOT NULL UNIQUE,
        flag VARCHAR NOT NULL,
        position INTEGER NOT NULL
    )
    """,
    """
    CREATE TABLE units (
        id VARCHAR NOT NULL PRIMARY KEY,
        course_code VARCHAR NOT NULL REFERENCES courses (code) ON DELETE CASCADE,
        section INTEGER NOT NULL,
        title VARCHAR NOT NULL,
        subtitle VARCHAR NOT NULL,
        color VARCHAR NOT NULL,
        color_dark VARCHAR NOT NULL,
        position INTEGER NOT NULL,
        UNIQUE (course_code, position)
    )
    """,
    'CREATE INDEX ix_units_course_code ON units (course_code)',
    """
    CREATE TABLE skills (
        id VARCHAR NOT NULL PRIMARY KEY,
        unit_id VARCHAR NOT NULL REFERENCES units (id) ON DELETE CASCADE,
        title VARCHAR NOT NULL,
        icon VARCHAR NOT NULL,
        description VARCHAR NOT NULL,
        position INTEGER NOT NULL,
        UNIQUE (unit_id, position)
    )
    """,
    'CREATE INDEX ix_skills_unit_id ON skills (unit_id)',
    """
    CREATE TABLE lessons (
        id VARCHAR NOT NULL PRIMARY KEY,
        skill_id VARCHAR NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
        title VARCHAR NOT NULL,
        position INTEGER NOT NULL,
        playable BOOLEAN NOT NULL,
        UNIQUE (skill_id, position)
    )
    """,
    'CREATE INDEX ix_lessons_skill_id ON lessons (skill_id)',
    """
    CREATE TABLE exercises (
        id VARCHAR NOT NULL PRIMARY KEY,
        lesson_id VARCHAR NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
        kind VARCHAR NOT NULL
            CHECK (kind IN ('multiple_choice', 'translate_wordbank', 'fill_blank', 'type_answer', 'match_pairs')),
        position INTEGER NOT NULL,
        spec JSON NOT NULL,
        solution JSON NOT NULL,
        UNIQUE (lesson_id, position)
    )
    """,
    'CREATE INDEX ix_exercises_lesson_id ON exercises (lesson_id)',
    """
    CREATE TABLE learners (
        id VARCHAR NOT NULL PRIMARY KEY,
        email VARCHAR UNIQUE CHECK (email IS NULL OR email = lower(email)),
        display_name VARCHAR NOT NULL,
        avatar VARCHAR NOT NULL,
        native_language VARCHAR NOT NULL,
        course_code VARCHAR NOT NULL REFERENCES courses (code),
        proficiency VARCHAR,
        daily_goal INTEGER NOT NULL CHECK (daily_goal BETWEEN 5 AND 60),
        theme VARCHAR NOT NULL CHECK (theme IN ('light', 'dark')),
        created_at DATETIME NOT NULL
    )
    """,
    """
    CREATE TABLE learner_stats (
        learner_id VARCHAR NOT NULL PRIMARY KEY REFERENCES learners (id) ON DELETE CASCADE,
        xp INTEGER NOT NULL,
        gems INTEGER NOT NULL,
        streak INTEGER NOT NULL,
        best_streak INTEGER NOT NULL,
        last_active_on VARCHAR,
        hearts INTEGER NOT NULL,
        max_hearts INTEGER NOT NULL,
        hearts_next_at DATETIME,
        daily_xp INTEGER NOT NULL,
        daily_xp_on VARCHAR NOT NULL,
        CHECK (hearts >= 0 AND hearts <= max_hearts),
        CHECK (xp >= 0 AND gems >= 0 AND streak >= 0)
    )
    """,
    """
    CREATE TABLE lesson_progress (
        learner_id VARCHAR NOT NULL REFERENCES learners (id) ON DELETE CASCADE,
        lesson_id VARCHAR NOT NULL REFERENCES lessons (id),
        first_completed_at DATETIME NOT NULL,
        last_completed_at DATETIME NOT NULL,
        completions INTEGER NOT NULL,
        best_mistakes INTEGER NOT NULL,
        last_time_sec INTEGER NOT NULL,
        PRIMARY KEY (learner_id, lesson_id)
    )
    """,
    """
    CREATE TABLE lesson_attempts (
        id VARCHAR NOT NULL PRIMARY KEY,
        learner_id VARCHAR NOT NULL REFERENCES learners (id) ON DELETE CASCADE,
        lesson_id VARCHAR NOT NULL REFERENCES lessons (id),
        mode VARCHAR NOT NULL CHECK (mode IN ('lesson', 'practice', 'legendary')),
        status VARCHAR NOT NULL CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
        exercise_order JSON NOT NULL,
        mistakes INTEGER NOT NULL,
        xp_awarded INTEGER NOT NULL,
        started_at DATETIME NOT NULL,
        finished_at DATETIME
    )
    """,
    'CREATE INDEX ix_lesson_attempts_learner_id ON lesson_attempts (learner_id)',
    'CREATE INDEX ix_lesson_attempts_lesson_id ON lesson_attempts (lesson_id)',
    """
    CREATE TABLE attempt_answers (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        attempt_id VARCHAR NOT NULL REFERENCES lesson_attempts (id) ON DELETE CASCADE,
        exercise_id VARCHAR NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
        correct BOOLEAN NOT NULL,
        answered_at DATETIME NOT NULL,
        UNIQUE (attempt_id, exercise_id)
    )
    """,
    'CREATE INDEX ix_attempt_answers_attempt_id ON attempt_answers (attempt_id)',
    """
    CREATE TABLE achievements (
        id VARCHAR NOT NULL PRIMARY KEY,
        title VARCHAR NOT NULL,
        description VARCHAR NOT NULL,
        icon VARCHAR NOT NULL,
        color VARCHAR NOT NULL,
        rule VARCHAR NOT NULL CHECK (rule IN ('xp', 'streak', 'lessons', 'perfect_lesson', 'legendary')),
        threshold INTEGER NOT NULL,
        position INTEGER NOT NULL
    )
    """,
    """
    CREATE TABLE learner_achievements (
        learner_id VARCHAR NOT NULL REFERENCES learners (id) ON DELETE CASCADE,
        achievement_id VARCHAR NOT NULL REFERENCES achievements (id) ON DELETE CASCADE,
        unlocked_at DATETIME NOT NULL,
        PRIMARY KEY (learner_id, achievement_id)
    )
    """,
    """
    CREATE TABLE rivals (
        id VARCHAR NOT NULL PRIMARY KEY,
        name VARCHAR NOT NULL,
        avatar VARCHAR NOT NULL,
        xp INTEGER NOT NULL
    )
    """,
)


def table_exists(conn: sqlite3.Connection, name: str) -> bool:
    row = conn.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (name,)).fetchone()
    return row is not None


def apply(conn: sqlite3.Connection) -> None:
    for table in LEGACY_TABLES:
        if table_exists(conn, table):
            conn.execute(f'ALTER TABLE {table} RENAME TO legacy_{table}')
    for statement in SCHEMA:
        conn.execute(statement)
