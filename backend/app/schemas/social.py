from .base import CamelModel


class LeaderboardRowOut(CamelModel):
    id: str
    name: str
    avatar: str
    xp: int
    rank: int
    is_me: bool = False


class LeaderboardOut(CamelModel):
    league: str
    users: list[LeaderboardRowOut]


class AchievementOut(CamelModel):
    id: str
    title: str
    description: str
    icon: str
    color: str
    rule_value: int
    progress: int
    unlocked: bool


class AchievementsOut(CamelModel):
    achievements: list[AchievementOut]
