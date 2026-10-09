from fastapi import APIRouter

from ..schemas.social import AchievementsOut, LeaderboardOut
from ..services import achievements, leaderboard
from .deps import CurrentLearner, Session

router = APIRouter(tags=['social'])


@router.get('/leaderboard', response_model=LeaderboardOut)
async def get_leaderboard(session: Session, learner: CurrentLearner):
    return await leaderboard.standings(session, learner)


@router.get('/achievements', response_model=AchievementsOut)
async def get_achievements(session: Session, learner: CurrentLearner):
    return AchievementsOut(achievements=await achievements.overview(session, learner))
