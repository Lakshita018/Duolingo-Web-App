from collections.abc import Callable
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core import clock
from ..models import Achievement, Learner, LearnerAchievement, LessonProgress
from ..schemas.social import AchievementOut


@dataclass(frozen=True)
class Standing:
    xp: int
    streak: int
    lessons: int
    perfect: bool = False
    legendary: bool = False


Measure = Callable[[Standing], int]

MEASURES: dict[str, Measure] = {
    'xp': lambda standing: standing.xp,
    'streak': lambda standing: standing.streak,
    'lessons': lambda standing: standing.lessons,
    'perfect_lesson': lambda standing: int(standing.perfect),
    'legendary': lambda standing: int(standing.legendary),
}


async def standing_for(session: AsyncSession, learner: Learner, perfect: bool = False, legendary: bool = False) -> Standing:
    lessons = await session.scalar(
        select(func.count()).select_from(LessonProgress).where(LessonProgress.learner_id == learner.id)
    )
    return Standing(
        xp=learner.stats.xp,
        streak=learner.stats.streak,
        lessons=lessons or 0,
        perfect=perfect,
        legendary=legendary,
    )


async def unlocked_ids(session: AsyncSession, learner: Learner) -> set[str]:
    rows = await session.scalars(
        select(LearnerAchievement.achievement_id).where(LearnerAchievement.learner_id == learner.id)
    )
    return set(rows.all())


async def unlock_earned(session: AsyncSession, learner: Learner, standing: Standing) -> list[str]:
    already = await unlocked_ids(session, learner)
    catalog = (await session.scalars(select(Achievement).order_by(Achievement.position))).all()
    earned = [
        achievement
        for achievement in catalog
        if achievement.id not in already and MEASURES[achievement.rule](standing) >= achievement.threshold
    ]
    now = clock.utcnow()
    for achievement in earned:
        session.add(LearnerAchievement(learner_id=learner.id, achievement_id=achievement.id, unlocked_at=now))
    if earned:
        await session.flush()
    return [achievement.id for achievement in earned]


async def overview(session: AsyncSession, learner: Learner) -> list[AchievementOut]:
    standing = await standing_for(session, learner)
    already = await unlocked_ids(session, learner)
    catalog = (await session.scalars(select(Achievement).order_by(Achievement.position))).all()
    entries = []
    for achievement in catalog:
        unlocked = achievement.id in already
        measured = MEASURES[achievement.rule](standing)
        entries.append(
            AchievementOut(
                id=achievement.id,
                title=achievement.title,
                description=achievement.description,
                icon=achievement.icon,
                color=achievement.color,
                rule_value=achievement.threshold,
                progress=achievement.threshold if unlocked else min(measured, achievement.threshold),
                unlocked=unlocked,
            )
        )
    return entries
