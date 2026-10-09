from datetime import timedelta

from fastapi import APIRouter
from sqlalchemy import delete

from ..core import clock
from ..models import LearnerAchievement, LessonAttempt, LessonProgress
from ..rules import RULES
from ..schemas.learner import LearnerOut
from ..services import learners
from .deps import CurrentLearner, Session

router = APIRouter(prefix='/dev', tags=['dev'])


@router.post('/advance-day', response_model=LearnerOut)
async def advance_day(session: Session, learner: CurrentLearner):
    yesterday = (clock.today() - timedelta(days=1)).isoformat()
    learner.stats.last_active_on = yesterday
    learner.stats.daily_xp = 0
    learner.stats.daily_xp_on = yesterday
    await session.commit()
    return await learners.present(session, learner)


@router.post('/reset', response_model=LearnerOut)
async def reset_progress(session: Session, learner: CurrentLearner):
    for table in (LearnerAchievement, LessonProgress, LessonAttempt):
        await session.execute(delete(table).where(table.learner_id == learner.id))
    stats = learner.stats
    stats.xp = 0
    stats.gems = RULES.starting_gems
    stats.streak = 0
    stats.best_streak = 0
    stats.last_active_on = None
    stats.hearts = stats.max_hearts
    stats.hearts_next_at = None
    stats.daily_xp = 0
    stats.daily_xp_on = clock.today().isoformat()
    await session.commit()
    return await learners.present(session, learner)
