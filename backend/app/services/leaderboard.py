from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Learner, LearnerStats, Rival
from ..rules import RULES
from ..schemas.social import LeaderboardOut, LeaderboardRowOut


@dataclass(frozen=True)
class Competitor:
    id: str
    name: str
    avatar: str
    xp: int
    is_me: bool = False

    @property
    def order(self) -> tuple:
        return (-self.xp, 0 if self.is_me else 1, self.name.lower(), self.id)


async def standings(session: AsyncSession, me: Learner) -> LeaderboardOut:
    rivals = (await session.scalars(select(Rival))).all()
    peers = (
        await session.execute(
            select(Learner.id, Learner.display_name, Learner.avatar, LearnerStats.xp)
            .join(LearnerStats, LearnerStats.learner_id == Learner.id)
            .where(Learner.id != me.id)
        )
    ).all()
    field = [Competitor(r.id, r.name, r.avatar, r.xp) for r in rivals]
    field += [Competitor(row.id, row.display_name, row.avatar, row.xp) for row in peers]
    field.append(Competitor(me.id, me.display_name, me.avatar, me.stats.xp, is_me=True))
    ranked = sorted(field, key=lambda competitor: competitor.order)

    window = ranked[: RULES.leaderboard_rows]
    if not any(competitor.is_me for competitor in window):
        window = ranked[: RULES.leaderboard_rows - 1] + [next(c for c in ranked if c.is_me)]
    positions = {competitor.id: index + 1 for index, competitor in enumerate(ranked)}
    return LeaderboardOut(
        league=RULES.league_name,
        users=[
            LeaderboardRowOut(
                id=c.id, name=c.name, avatar=c.avatar, xp=c.xp, rank=positions[c.id], is_me=c.is_me
            )
            for c in window
        ],
    )
