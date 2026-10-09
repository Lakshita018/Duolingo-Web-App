from datetime import date, datetime, timedelta

from ..models import LearnerStats
from ..rules import RULES

REGEN_INTERVAL = timedelta(minutes=RULES.heart_regen_minutes)


def roll_forward(stats: LearnerStats, now: datetime, today: date) -> bool:
    before = (stats.hearts, stats.hearts_next_at, stats.streak, stats.daily_xp, stats.daily_xp_on)
    if stats.daily_xp_on != today.isoformat():
        stats.daily_xp = 0
        stats.daily_xp_on = today.isoformat()
    _regenerate_hearts(stats, now)
    if stats.streak and (stats.last_active_on is None or stats.last_active_on < (today - timedelta(days=1)).isoformat()):
        stats.streak = 0
    return before != (stats.hearts, stats.hearts_next_at, stats.streak, stats.daily_xp, stats.daily_xp_on)


def _regenerate_hearts(stats: LearnerStats, now: datetime) -> None:
    if stats.hearts >= stats.max_hearts:
        stats.hearts = stats.max_hearts
        stats.hearts_next_at = None
        return
    if stats.hearts_next_at is None:
        stats.hearts_next_at = now + REGEN_INTERVAL
        return
    if now < stats.hearts_next_at:
        return
    gained = 1 + (now - stats.hearts_next_at) // REGEN_INTERVAL
    stats.hearts = min(stats.max_hearts, stats.hearts + gained)
    stats.hearts_next_at = None if stats.hearts >= stats.max_hearts else stats.hearts_next_at + gained * REGEN_INTERVAL


def lose_heart(stats: LearnerStats, now: datetime) -> None:
    stats.hearts = max(0, stats.hearts - 1)
    if stats.hearts < stats.max_hearts and stats.hearts_next_at is None:
        stats.hearts_next_at = now + REGEN_INTERVAL


def gain_heart(stats: LearnerStats) -> None:
    stats.hearts = min(stats.max_hearts, stats.hearts + 1)
    if stats.hearts >= stats.max_hearts:
        stats.hearts_next_at = None


def refill_hearts(stats: LearnerStats) -> None:
    stats.hearts = stats.max_hearts
    stats.hearts_next_at = None


def record_activity(stats: LearnerStats, today: date) -> None:
    marker = today.isoformat()
    if stats.last_active_on == marker:
        return
    yesterday = (today - timedelta(days=1)).isoformat()
    stats.streak = stats.streak + 1 if stats.last_active_on == yesterday else 1
    stats.best_streak = max(stats.best_streak, stats.streak)
    stats.last_active_on = marker


def award_xp(stats: LearnerStats, amount: int) -> None:
    stats.xp += amount
    stats.daily_xp += amount
