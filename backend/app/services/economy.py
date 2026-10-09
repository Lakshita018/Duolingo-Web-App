from sqlalchemy.ext.asyncio import AsyncSession

from ..core.errors import InsufficientGems
from ..models import Learner
from ..rules import RULES
from . import vitals


async def refill_hearts_with_gems(session: AsyncSession, learner: Learner) -> bool:
    stats = learner.stats
    if stats.hearts >= stats.max_hearts:
        return False
    if stats.gems < RULES.heart_refill_cost:
        raise InsufficientGems(f'Not enough gems. Need {RULES.heart_refill_cost - stats.gems} more')
    stats.gems -= RULES.heart_refill_cost
    vitals.refill_hearts(stats)
    await session.flush()
    return True
