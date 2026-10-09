from typing import Any, Literal

from pydantic import Field

from ..exercises import Pair
from .base import CamelModel
from .learner import LearnerOut

AttemptMode = Literal['lesson', 'practice', 'legendary']


class StartAttemptIn(CamelModel):
    mode: AttemptMode = 'lesson'


class SkillBannerOut(CamelModel):
    id: str
    title: str
    color: str
    color_dark: str


class AttemptOut(CamelModel):
    attempt_id: str
    id: str
    title: str
    mode: AttemptMode
    legendary: bool
    skill: SkillBannerOut
    exercises: list[dict[str, Any]]


class AnswerIn(CamelModel):
    exercise_id: str = Field(min_length=1)
    answer: str | list[str] | list[Pair] | None = None


class AnswerOut(CamelModel):
    correct: bool
    correct_answer: str | list[Pair]
    hearts: int
    translation: str | None = None
    mistakes: int
    out_of_hearts: bool


class CompleteOut(CamelModel):
    ok: bool = True
    user: LearnerOut
    xp_earned: int
    skill_crowns: int
    new_achievements: list[str]
    mistakes: int
    time_sec: int
    accuracy: int
