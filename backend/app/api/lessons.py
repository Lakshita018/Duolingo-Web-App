from fastapi import APIRouter

from ..schemas.lessons import AnswerIn, AnswerOut, AttemptOut, CompleteOut, StartAttemptIn
from ..services import attempts, learners
from .deps import CurrentLearner, Session

router = APIRouter(tags=['lessons'])


@router.post('/lessons/{lesson_id}/attempts', response_model=AttemptOut, status_code=201)
async def start_attempt(lesson_id: str, body: StartAttemptIn, session: Session, learner: CurrentLearner):
    attempt = await attempts.start(session, learner, lesson_id, body.mode)
    await session.commit()
    return attempt


@router.post('/attempts/{attempt_id}/answers', response_model=AnswerOut)
async def submit_answer(attempt_id: str, body: AnswerIn, session: Session, learner: CurrentLearner):
    result = await attempts.answer(session, learner, attempt_id, body)
    await session.commit()
    return result


@router.post('/attempts/{attempt_id}/complete', response_model=CompleteOut)
async def complete_attempt(attempt_id: str, session: Session, learner: CurrentLearner):
    completion = await attempts.complete(session, learner, attempt_id)
    await session.commit()
    return CompleteOut(
        user=await learners.present(session, learner),
        xp_earned=completion.xp_earned,
        skill_crowns=completion.crowns,
        new_achievements=completion.new_achievements,
        mistakes=completion.attempt.mistakes,
        time_sec=completion.time_sec,
        accuracy=completion.accuracy,
    )
