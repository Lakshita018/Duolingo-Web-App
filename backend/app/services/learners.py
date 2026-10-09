import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core import clock
from ..core.errors import Invalid, LearnerNotFound
from ..models import (
    Course,
    Learner,
    LearnerAchievement,
    LearnerStats,
    Lesson,
    LessonProgress,
)
from ..rules import RULES
from ..schemas.base import iso_utc
from ..schemas.learner import LearnerOut, LessonProgressOut, OnboardingIn, ProfileUpdateIn, SkillProgressOut
from . import vitals

DEFAULT_COURSE = 'es'


def new_stats(today: str) -> LearnerStats:
    return LearnerStats(daily_xp_on=today)


async def find_by_email(session: AsyncSession, email: str) -> Learner | None:
    return await session.scalar(select(Learner).where(Learner.email == email.strip().lower()))


async def default_learner(session: AsyncSession) -> Learner:
    learner = await session.get(Learner, RULES.default_learner_id)
    if learner is None:
        learner = Learner(
            id=RULES.default_learner_id,
            course_code=DEFAULT_COURSE,
            stats=new_stats(clock.today().isoformat()),
        )
        session.add(learner)
        await session.flush()
    return learner


async def resolve(session: AsyncSession, email: str | None) -> Learner:
    if email and email.strip():
        learner = await find_by_email(session, email)
        if learner is None:
            raise LearnerNotFound()
        return learner
    return await default_learner(session)


def settle(learner: Learner) -> bool:
    return vitals.roll_forward(learner.stats, clock.utcnow(), clock.today())


async def course_for(session: AsyncSession, language: str) -> Course:
    key = language.strip().lower()
    courses = (await session.scalars(select(Course))).all()
    for course in courses:
        if key in (course.code.lower(), course.name.lower()):
            return course
    offered = ', '.join(course.name for course in courses)
    raise Invalid(f'Unsupported language "{language}". Choose one of: {offered}')


async def onboard(session: AsyncSession, payload: OnboardingIn) -> Learner:
    course = await course_for(session, payload.target_language)
    learner = await find_by_email(session, payload.email)
    if learner is None:
        unclaimed = await session.get(Learner, RULES.default_learner_id)
        if unclaimed is not None and unclaimed.email is None:
            learner = unclaimed
        else:
            learner = Learner(id=uuid.uuid4().hex, stats=new_stats(clock.today().isoformat()))
            session.add(learner)
    learner.email = payload.email
    learner.display_name = payload.name
    learner.native_language = payload.native_language
    learner.course = course
    learner.course_code = course.code
    learner.proficiency = payload.proficiency_level
    learner.daily_goal = payload.daily_goal
    await session.flush()
    return learner


async def update_profile(session: AsyncSession, learner: Learner, changes: ProfileUpdateIn) -> Learner:
    values = changes.model_dump(exclude_unset=True, exclude_none=True)
    mapping = {'name': 'display_name', 'avatar': 'avatar', 'daily_goal': 'daily_goal', 'theme': 'theme'}
    for field, value in values.items():
        setattr(learner, mapping[field], value)
    await session.flush()
    return learner


async def present(session: AsyncSession, learner: Learner) -> LearnerOut:
    stats = learner.stats
    progress_rows = (
        await session.execute(
            select(LessonProgress, Lesson.skill_id, Lesson.playable)
            .join(Lesson, Lesson.id == LessonProgress.lesson_id)
            .where(LessonProgress.learner_id == learner.id)
        )
    ).all()
    lesson_progress = {
        row.lesson_id: LessonProgressOut(completed=True, mistakes=row.best_mistakes, time_sec=row.last_time_sec)
        for row, _, _ in progress_rows
    }

    completed: dict[str, int] = {}
    completed_playable: dict[str, int] = {}
    for _, skill_id, playable in progress_rows:
        completed[skill_id] = completed.get(skill_id, 0) + 1
        completed_playable[skill_id] = completed_playable.get(skill_id, 0) + int(playable)
    playable_total: dict[str, int] = {}
    if completed:
        totals = await session.execute(
            select(Lesson.skill_id, func.count(Lesson.id))
            .where(Lesson.skill_id.in_(completed), Lesson.playable.is_(True))
            .group_by(Lesson.skill_id)
        )
        playable_total = dict(totals.all())
    skill_progress = {
        skill_id: SkillProgressOut(
            crowns=int(playable_total.get(skill_id, 0) > 0 and completed_playable[skill_id] >= playable_total[skill_id]),
            lessons_completed=count,
        )
        for skill_id, count in completed.items()
    }

    unlocked = (
        await session.scalars(select(LearnerAchievement.achievement_id).where(LearnerAchievement.learner_id == learner.id))
    ).all()
    return LearnerOut(
        id=learner.id,
        name=learner.display_name,
        email=learner.email,
        native_language=learner.native_language,
        target_language=learner.course.name,
        proficiency_level=learner.proficiency,
        avatar=learner.avatar,
        created_at=iso_utc(learner.created_at) or '',
        xp=stats.xp,
        streak=stats.streak,
        best_streak=stats.best_streak,
        last_active=stats.last_active_on,
        hearts=stats.hearts,
        max_hearts=stats.max_hearts,
        hearts_regen_at=iso_utc(stats.hearts_next_at),
        gems=stats.gems,
        daily_goal=learner.daily_goal,
        daily_xp=stats.daily_xp,
        daily_xp_date=stats.daily_xp_on,
        language=learner.course_code,
        course_code=learner.course_code,
        theme=learner.theme,
        skill_progress=skill_progress,
        lesson_progress=lesson_progress,
        achievements=list(unlocked),
    )
