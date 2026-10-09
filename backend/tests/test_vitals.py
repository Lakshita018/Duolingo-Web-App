from datetime import date, datetime, timedelta

from app.models import LearnerStats
from app.services import vitals

NOW = datetime(2026, 3, 10, 12, 0, 0)
TODAY = date(2026, 3, 10)


def stats(**values) -> LearnerStats:
    base = dict(
        xp=0,
        gems=0,
        streak=0,
        best_streak=0,
        last_active_on=None,
        hearts=5,
        max_hearts=5,
        hearts_next_at=None,
        daily_xp=0,
        daily_xp_on=TODAY.isoformat(),
    )
    base.update(values)
    return LearnerStats(**base)


def test_hearts_regenerate_for_every_elapsed_interval():
    record = stats(hearts=1, hearts_next_at=NOW - timedelta(minutes=65))
    assert vitals.roll_forward(record, NOW, TODAY)
    assert record.hearts == 4
    assert record.hearts_next_at == NOW + timedelta(minutes=25)


def test_hearts_regeneration_stops_at_the_cap_and_clears_the_timer():
    record = stats(hearts=3, hearts_next_at=NOW - timedelta(hours=10))
    vitals.roll_forward(record, NOW, TODAY)
    assert record.hearts == 5
    assert record.hearts_next_at is None


def test_losing_a_heart_starts_the_timer_only_once():
    record = stats()
    vitals.lose_heart(record, NOW)
    first = record.hearts_next_at
    vitals.lose_heart(record, NOW + timedelta(minutes=5))
    assert record.hearts == 3
    assert record.hearts_next_at == first == NOW + timedelta(minutes=30)


def test_hearts_never_go_negative():
    record = stats(hearts=0, hearts_next_at=NOW + timedelta(minutes=10))
    vitals.lose_heart(record, NOW)
    assert record.hearts == 0


def test_streak_extends_on_consecutive_days_and_restarts_after_a_gap():
    record = stats(streak=2, best_streak=2, last_active_on=(TODAY - timedelta(days=1)).isoformat())
    vitals.record_activity(record, TODAY)
    assert (record.streak, record.best_streak) == (3, 3)
    vitals.record_activity(record, TODAY)
    assert record.streak == 3

    stale = stats(streak=4, best_streak=4, last_active_on=(TODAY - timedelta(days=3)).isoformat())
    vitals.roll_forward(stale, NOW, TODAY)
    assert stale.streak == 0
    vitals.record_activity(stale, TODAY)
    assert (stale.streak, stale.best_streak) == (1, 4)


def test_streak_survives_until_the_end_of_the_following_day():
    record = stats(streak=5, last_active_on=(TODAY - timedelta(days=1)).isoformat())
    vitals.roll_forward(record, NOW, TODAY)
    assert record.streak == 5


def test_daily_xp_resets_on_a_new_day():
    record = stats(daily_xp=40, daily_xp_on=(TODAY - timedelta(days=1)).isoformat())
    vitals.roll_forward(record, NOW, TODAY)
    assert (record.daily_xp, record.daily_xp_on) == (0, TODAY.isoformat())
    vitals.award_xp(record, 15)
    assert (record.xp, record.daily_xp) == (15, 15)
