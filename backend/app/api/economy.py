from fastapi import APIRouter

from ..schemas.economy import RefillIn, RefillOut
from ..services import economy, learners
from .deps import CurrentLearner, Session

router = APIRouter(tags=['economy'])


@router.post('/hearts/refill', response_model=RefillOut)
async def refill_hearts(session: Session, learner: CurrentLearner, body: RefillIn | None = None):
    refilled = await economy.refill_hearts_with_gems(session, learner)
    await session.commit()
    return RefillOut(
        user=await learners.present(session, learner),
        message=None if refilled else 'Hearts already full',
    )
