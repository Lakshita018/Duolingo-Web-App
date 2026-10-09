from datetime import datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core import clock
from ..db.base import Base
from ..rules import RULES
from .catalog import Course

ATTEMPT_MODES = ('lesson', 'practice', 'legendary')
ATTEMPT_STATUSES = ('active', 'completed', 'failed', 'abandoned')
ACHIEVEMENT_RULES = ('xp', 'streak', 'lessons', 'perfect_lesson', 'legendary')


def _one_of(column: str, values: tuple[str, ...]) -> str:
    return f'{column} IN (' + ', '.join(f"'{value}'" for value in values) + ')'


class Learner(Base):
    __tablename__ = 'learners'
    __table_args__ = (
        CheckConstraint('email IS NULL OR email = lower(email)', name='email_lowercase'),
        CheckConstraint(_one_of('theme', ('light', 'dark')), name='theme'),
        CheckConstraint(
            f'daily_goal BETWEEN {RULES.min_daily_goal} AND {RULES.max_daily_goal}', name='daily_goal'
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    display_name: Mapped[str] = mapped_column(String, default='Learner')
    avatar: Mapped[str] = mapped_column(String, default='avatar-sun')
    native_language: Mapped[str] = mapped_column(String, default='English')
    course_code: Mapped[str] = mapped_column(ForeignKey('courses.code'), default='es')
    proficiency: Mapped[str | None] = mapped_column(String, nullable=True)
    daily_goal: Mapped[int] = mapped_column(Integer, default=RULES.default_daily_goal)
    theme: Mapped[str] = mapped_column(String, default='light')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=clock.utcnow)

    course: Mapped[Course] = relationship(lazy='joined')
    stats: Mapped['LearnerStats'] = relationship(
        back_populates='learner', uselist=False, lazy='joined', cascade='all, delete-orphan'
    )


class LearnerStats(Base):
    __tablename__ = 'learner_stats'
    __table_args__ = (
        CheckConstraint('hearts >= 0 AND hearts <= max_hearts', name='hearts_range'),
        CheckConstraint('xp >= 0 AND gems >= 0 AND streak >= 0', name='non_negative'),
    )

    learner_id: Mapped[str] = mapped_column(ForeignKey('learners.id', ondelete='CASCADE'), primary_key=True)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    gems: Mapped[int] = mapped_column(Integer, default=RULES.starting_gems)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_active_on: Mapped[str | None] = mapped_column(String, nullable=True)
    hearts: Mapped[int] = mapped_column(Integer, default=RULES.max_hearts)
    max_hearts: Mapped[int] = mapped_column(Integer, default=RULES.max_hearts)
    hearts_next_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    daily_xp: Mapped[int] = mapped_column(Integer, default=0)
    daily_xp_on: Mapped[str] = mapped_column(String, default='')

    learner: Mapped[Learner] = relationship(back_populates='stats')


class LessonProgress(Base):
    __tablename__ = 'lesson_progress'

    learner_id: Mapped[str] = mapped_column(ForeignKey('learners.id', ondelete='CASCADE'), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey('lessons.id'), primary_key=True)
    first_completed_at: Mapped[datetime] = mapped_column(DateTime, default=clock.utcnow)
    last_completed_at: Mapped[datetime] = mapped_column(DateTime, default=clock.utcnow)
    completions: Mapped[int] = mapped_column(Integer, default=1)
    best_mistakes: Mapped[int] = mapped_column(Integer, default=0)
    last_time_sec: Mapped[int] = mapped_column(Integer, default=0)


class LessonAttempt(Base):
    __tablename__ = 'lesson_attempts'
    __table_args__ = (
        CheckConstraint(_one_of('mode', ATTEMPT_MODES), name='mode'),
        CheckConstraint(_one_of('status', ATTEMPT_STATUSES), name='status'),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    learner_id: Mapped[str] = mapped_column(ForeignKey('learners.id', ondelete='CASCADE'), index=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey('lessons.id'), index=True)
    mode: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default='active')
    exercise_order: Mapped[list] = mapped_column(JSON)
    mistakes: Mapped[int] = mapped_column(Integer, default=0)
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=clock.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    answers: Mapped[list['AttemptAnswer']] = relationship(
        back_populates='attempt', cascade='all, delete-orphan'
    )


class AttemptAnswer(Base):
    __tablename__ = 'attempt_answers'
    __table_args__ = (UniqueConstraint('attempt_id', 'exercise_id'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_id: Mapped[str] = mapped_column(ForeignKey('lesson_attempts.id', ondelete='CASCADE'), index=True)
    exercise_id: Mapped[str] = mapped_column(ForeignKey('exercises.id', ondelete='CASCADE'))
    correct: Mapped[bool] = mapped_column(Boolean)
    answered_at: Mapped[datetime] = mapped_column(DateTime, default=clock.utcnow)

    attempt: Mapped[LessonAttempt] = relationship(back_populates='answers')


class Achievement(Base):
    __tablename__ = 'achievements'
    __table_args__ = (CheckConstraint(_one_of('rule', ACHIEVEMENT_RULES), name='rule'),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    icon: Mapped[str] = mapped_column(String)
    color: Mapped[str] = mapped_column(String)
    rule: Mapped[str] = mapped_column(String)
    threshold: Mapped[int] = mapped_column(Integer)
    position: Mapped[int] = mapped_column(Integer, default=0)


class LearnerAchievement(Base):
    __tablename__ = 'learner_achievements'

    learner_id: Mapped[str] = mapped_column(ForeignKey('learners.id', ondelete='CASCADE'), primary_key=True)
    achievement_id: Mapped[str] = mapped_column(
        ForeignKey('achievements.id', ondelete='CASCADE'), primary_key=True
    )
    unlocked_at: Mapped[datetime] = mapped_column(DateTime, default=clock.utcnow)


class Rival(Base):
    __tablename__ = 'rivals'

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    avatar: Mapped[str] = mapped_column(String)
    xp: Mapped[int] = mapped_column(Integer, default=0)
