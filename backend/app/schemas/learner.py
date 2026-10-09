import re
from typing import Literal

from pydantic import Field, field_validator

from ..rules import RULES
from .base import CamelModel

EMAIL_PATTERN = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def clean_email(value: str) -> str:
    email = value.strip().lower()
    if not EMAIL_PATTERN.fullmatch(email):
        raise ValueError('Please enter a valid email address')
    return email


class LessonProgressOut(CamelModel):
    completed: bool
    mistakes: int
    time_sec: int


class SkillProgressOut(CamelModel):
    crowns: int
    lessons_completed: int


class LearnerOut(CamelModel):
    id: str
    name: str
    email: str | None
    native_language: str
    target_language: str
    proficiency_level: str | None
    avatar: str
    created_at: str
    xp: int
    streak: int
    best_streak: int
    last_active: str | None
    hearts: int
    max_hearts: int
    hearts_regen_at: str | None
    gems: int
    daily_goal: int
    daily_xp: int
    daily_xp_date: str
    language: str
    course_code: str
    theme: Literal['light', 'dark']
    skill_progress: dict[str, SkillProgressOut]
    lesson_progress: dict[str, LessonProgressOut]
    achievements: list[str]


class OnboardingIn(CamelModel):
    name: str = Field(min_length=1, max_length=40)
    email: str = Field(min_length=3, max_length=254)
    native_language: str = Field(default='English', min_length=1, max_length=40)
    target_language: str = Field(min_length=2, max_length=40)
    proficiency_level: str = Field(min_length=2, max_length=80)
    daily_goal: int = Field(default=10, ge=RULES.min_daily_goal, le=RULES.max_daily_goal)

    @field_validator('email')
    @classmethod
    def normalise_email(cls, value: str) -> str:
        return clean_email(value)

    @field_validator('name', 'native_language', 'target_language', 'proficiency_level')
    @classmethod
    def strip_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError('must not be blank')
        return stripped


class ProfileUpdateIn(CamelModel):
    name: str | None = None
    avatar: str | None = None
    daily_goal: int | None = Field(default=None, ge=RULES.min_daily_goal, le=RULES.max_daily_goal)
    theme: Literal['light', 'dark'] | None = None

    @field_validator('name', 'avatar')
    @classmethod
    def trim(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        limit = 40 if info.field_name == 'name' else 32
        stripped = value.strip()[:limit]
        if not stripped:
            raise ValueError('must not be blank')
        return stripped
