from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_session
from ..models import Learner
from ..services import learners

Session = Annotated[AsyncSession, Depends(get_session)]


async def current_learner(
    session: Session,
    x_learner_email: Annotated[str | None, Header()] = None,
) -> Learner:
    learner = await learners.resolve(session, x_learner_email)
    learners.settle(learner)
    await session.commit()
    return learner


CurrentLearner = Annotated[Learner, Depends(current_learner)]
