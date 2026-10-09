from dataclasses import dataclass


@dataclass(frozen=True)
class Rules:
    default_learner_id: str = 'default-user'
    lesson_xp: int = 15
    xp_lost_per_mistake: int = 2
    minimum_lesson_xp: int = 5
    practice_xp: int = 5
    legendary_xp: int = 40
    gems_per_completion: int = 5
    starting_gems: int = 500
    max_hearts: int = 5
    heart_regen_minutes: int = 30
    heart_refill_cost: int = 350
    min_daily_goal: int = 5
    max_daily_goal: int = 60
    default_daily_goal: int = 30
    leaderboard_rows: int = 5
    league_name: str = 'Bronze'


RULES = Rules()
