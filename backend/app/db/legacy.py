import logging
import re
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core import clock
from ..models import (
    Achievement,
    Course,
    Learner,
    LearnerAchievement,
    LearnerStats,
    Lesson,
    LessonProgress,
)
from ..rules import RULES

log = logging.getLogger(__name__)

DROP_ORDER = (
    'legacy_user_achievements',
    'legacy_user_lesson_progress',
    'legacy_user_skill_progress',
    'legacy_exercises',
    'legacy_lessons',
    'legacy_skills',
    'legacy_units',
    'legacy_achievements',
    'legacy_leaderboard_seed',
    'legacy_users',
)

SHORT_LESSON = re.compile(r'^(?:(?P<code>[a-z]{2})-)?l(?P<n>\d+)$')
SKILL_LESSON = re.compile(r'^(?:(?P<code>[a-z]{2})-)?s(?P<s>\d+)-l(?P<l>\d+)$')
SKILL_ID = re.compile(r'^(?:(?P<code>[a-z]{2})-)?s(?P<n>\d+)$')


@dataclass
class LegacyReport:
    learners: int = 0
    lessons: int = 0
    achievements: int = 0
    unmapped: int = 0


def canonical_lesson_id(raw: str, known: set[str]) -> str | None:
    if raw in known:
        return raw
    short = SHORT_LESSON.match(raw)
    if short:
        code = short['code'] or 'es'
        number = int(short['n']) - 1
        candidate = f'{code}-s{number // 2 + 1}-l{number % 2 + 1}'
        return candidate if candidate in known else None
    skilled = SKILL_LESSON.match(raw)
    if skilled:
        candidate = f"{skilled['code'] or 'es'}-s{skilled['s']}-l{skilled['l']}"
        return candidate if candidate in known else None
    return None


def canonical_skill_id(raw: str, known: set[str]) -> str | None:
    if raw in known:
        return raw
    match = SKILL_ID.match(raw)
    if match:
        candidate = f"{match['code'] or 'es'}-s{match['n']}"
        return candidate if candidate in known else None
    return None


def parse_timestamp(value: object) -> datetime:
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return clock.utcnow()


def clamp(value: object, low: int, high: int, default: int) -> int:
    try:
        return max(low, min(high, int(value)))
    except (TypeError, ValueError):
        return default


def resolve_course(row: dict, course_keys: dict[str, str]) -> str:
    for field in ('target_language', 'language'):
        key = str(row.get(field) or '').strip().lower()
        if key in course_keys:
            return course_keys[key]
    return 'es'


async def legacy_tables(session: AsyncSession) -> set[str]:
    rows = await session.execute(text("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'legacy\\_%' ESCAPE '\\'"))
    return {row[0] for row in rows}


async def absorb_legacy_data(session: AsyncSession) -> LegacyReport | None:
    present = await legacy_tables(session)
    if 'legacy_users' not in present:
        return None

    report = LegacyReport()
    known_lessons = set((await session.scalars(select(Lesson.id))).all())
    known_achievements = set((await session.scalars(select(Achievement.id))).all())
    course_keys: dict[str, str] = {}
    for course in (await session.scalars(select(Course))).all():
        course_keys[course.code.lower()] = course.code
        course_keys[course.name.lower()] = course.code

    existing_learners = set((await session.scalars(select(Learner.id))).all())
    claimed_emails = {email for email in (await session.scalars(select(Learner.email))).all() if email}
    imported: set[str] = set()

    for row in (await session.execute(text('SELECT * FROM legacy_users'))).mappings().all():
        data = dict(row)
        learner_id = data['id']
        if learner_id in existing_learners:
            imported.add(learner_id)
            continue
        email = (data.get('email') or '').strip().lower() or None
        if email in claimed_emails:
            email = None
        if email:
            claimed_emails.add(email)
        max_hearts = clamp(data.get('max_hearts'), 1, 10, RULES.max_hearts)
        learner = Learner(
            id=learner_id,
            email=email,
            display_name=(data.get('name') or 'Learner')[:40],
            avatar=data.get('avatar') or 'avatar-sun',
            native_language=data.get('native_language') or 'English',
            course_code=resolve_course(data, course_keys),
            proficiency=data.get('proficiency_level') or data.get('proficiency'),
            daily_goal=clamp(data.get('daily_goal'), RULES.min_daily_goal, RULES.max_daily_goal, RULES.default_daily_goal),
            theme=data.get('theme') if data.get('theme') in ('light', 'dark') else 'light',
            created_at=parse_timestamp(data.get('created_at')),
        )
        learner.stats = LearnerStats(
            xp=max(0, clamp(data.get('xp'), 0, 10**9, 0)),
            gems=clamp(data.get('gems'), 0, 10**9, RULES.starting_gems),
            streak=clamp(data.get('streak'), 0, 10**6, 0),
            best_streak=clamp(data.get('streak'), 0, 10**6, 0),
            last_active_on=data.get('last_active'),
            hearts=clamp(data.get('hearts'), 0, max_hearts, max_hearts),
            max_hearts=max_hearts,
            hearts_next_at=parse_timestamp(data['hearts_regen_at']) if data.get('hearts_regen_at') else None,
            daily_xp=clamp(data.get('daily_xp'), 0, 10**6, 0),
            daily_xp_on=data.get('daily_xp_date') or '',
        )
        session.add(learner)
        existing_learners.add(learner_id)
        imported.add(learner_id)
        report.learners += 1
    await session.flush()

    if 'legacy_user_lesson_progress' in present:
        merged: dict[tuple[str, str], dict] = {}
        rows = (await session.execute(text('SELECT * FROM legacy_user_lesson_progress ORDER BY updated_at'))).mappings().all()
        for row in rows:
            lesson_id = canonical_lesson_id(row['lesson_id'], known_lessons)
            if row['user_id'] not in imported or lesson_id is None:
                report.unmapped += 1
                continue
            if not row['completed']:
                continue
            stamp = parse_timestamp(row['updated_at'])
            entry = merged.setdefault(
                (row['user_id'], lesson_id),
                dict(first=stamp, last=stamp, count=0, mistakes=row['mistakes'], time=row['time_sec']),
            )
            entry['count'] += 1
            entry['first'] = min(entry['first'], stamp)
            entry['last'] = max(entry['last'], stamp)
            entry['mistakes'] = min(entry['mistakes'], row['mistakes'])
            entry['time'] = row['time_sec'] or entry['time']
        for (learner_id, lesson_id), entry in merged.items():
            if await session.get(LessonProgress, (learner_id, lesson_id)) is not None:
                continue
            session.add(
                LessonProgress(
                    learner_id=learner_id,
                    lesson_id=lesson_id,
                    first_completed_at=entry['first'],
                    last_completed_at=entry['last'],
                    completions=entry['count'],
                    best_mistakes=max(0, entry['mistakes']),
                    last_time_sec=max(0, entry['time']),
                )
            )
            report.lessons += 1

    if 'legacy_user_skill_progress' in present:
        lessons_by_skill: dict[str, list[str]] = {}
        lesson_rows = await session.execute(select(Lesson.skill_id, Lesson.id).order_by(Lesson.skill_id, Lesson.position))
        for skill_id, lesson_id in lesson_rows:
            lessons_by_skill.setdefault(skill_id, []).append(lesson_id)
        rows = (await session.execute(text('SELECT * FROM legacy_user_skill_progress'))).mappings().all()
        for row in rows:
            skill_id = canonical_skill_id(row['skill_id'], set(lessons_by_skill))
            if row['user_id'] not in imported or skill_id is None:
                report.unmapped += 1
                continue
            claimed = max(0, int(row['lessons_completed'] or 0))
            for lesson_id in lessons_by_skill[skill_id][:claimed]:
                if await session.get(LessonProgress, (row['user_id'], lesson_id)) is None:
                    now = clock.utcnow()
                    session.add(
                        LessonProgress(
                            learner_id=row['user_id'],
                            lesson_id=lesson_id,
                            first_completed_at=now,
                            last_completed_at=now,
                            completions=1,
                            best_mistakes=0,
                            last_time_sec=0,
                        )
                    )
                    report.lessons += 1
                    await session.flush()

    if 'legacy_user_achievements' in present:
        rows = (await session.execute(text('SELECT * FROM legacy_user_achievements'))).mappings().all()
        for row in rows:
            if row['user_id'] not in imported or row['achievement_id'] not in known_achievements:
                report.unmapped += 1
                continue
            if await session.get(LearnerAchievement, (row['user_id'], row['achievement_id'])) is None:
                session.add(
                    LearnerAchievement(
                        learner_id=row['user_id'],
                        achievement_id=row['achievement_id'],
                        unlocked_at=parse_timestamp(row['unlocked_at']),
                    )
                )
                report.achievements += 1
    await session.flush()

    if report.unmapped:
        log.warning('Kept legacy tables: %d legacy rows could not be mapped to current content', report.unmapped)
    else:
        for table in DROP_ORDER:
            if table in present:
                await session.execute(text(f'DROP TABLE {table}'))
    return report
