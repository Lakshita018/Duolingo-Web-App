from fastapi import APIRouter

from ..core.errors import LearnerNotFound
from ..schemas.learner import LearnerOut, OnboardingIn, ProfileUpdateIn
from ..services import learners
from .deps import CurrentLearner, Session

router = APIRouter(tags=['learners'])


@router.post('/onboarding', response_model=LearnerOut)
async def onboarding(payload: OnboardingIn, session: Session):
    learner = await learners.onboard(session, payload)
    learners.settle(learner)
    await session.commit()
    return await learners.present(session, learner)


@router.get('/user/by-email', response_model=LearnerOut)
async def user_by_email(email: str, session: Session):
    learner = await learners.find_by_email(session, email)
    if learner is None:
        raise LearnerNotFound()
    learners.settle(learner)
    await session.commit()
    return await learners.present(session, learner)


@router.get('/user', response_model=LearnerOut)
async def get_user(session: Session, learner: CurrentLearner):
    return await learners.present(session, learner)


@router.post('/user', response_model=LearnerOut)
async def update_user(changes: ProfileUpdateIn, session: Session, learner: CurrentLearner):
    await learners.update_profile(session, learner, changes)
    await session.commit()
    return await learners.present(session, learner)
