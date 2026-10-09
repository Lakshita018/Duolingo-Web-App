import json
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from ..exercises import kind_for

DATA_DIR = Path(__file__).parent / 'data'


class ExerciseDef(BaseModel):
    id: str
    kind: str
    spec: dict
    solution: dict

    @model_validator(mode='after')
    def validate_against_kind(self) -> 'ExerciseDef':
        try:
            spec, solution = kind_for(self.kind).parse(self.spec, self.solution)
        except ValueError as error:
            raise ValueError(f'{self.id}: {error}') from error
        self.spec = spec.model_dump(exclude_none=True)
        self.solution = solution.model_dump(exclude_none=True)
        return self


class LessonDef(BaseModel):
    id: str
    title: str
    playable: bool = True
    exercises: list[ExerciseDef] = Field(min_length=1)


class SkillDef(BaseModel):
    id: str
    title: str
    icon: str
    description: str = ''
    lessons: list[LessonDef] = Field(min_length=1)


class UnitDef(BaseModel):
    id: str
    section: int = 1
    title: str
    subtitle: str
    color: str
    colorDark: str
    skills: list[SkillDef] = Field(default_factory=list)


class CoursePack(BaseModel):
    code: str
    name: str
    flag: str
    units: list[UnitDef] = Field(min_length=1)

    @model_validator(mode='after')
    def validate_identifiers(self) -> 'CoursePack':
        seen: set[str] = set()
        for unit in self.units:
            for identifier in self._identifiers(unit):
                if not identifier.startswith(f'{self.code}-'):
                    raise ValueError(f'{identifier} must be prefixed with {self.code}-')
                if identifier in seen:
                    raise ValueError(f'duplicate identifier {identifier}')
                seen.add(identifier)
        return self

    @staticmethod
    def _identifiers(unit: UnitDef):
        yield unit.id
        for skill in unit.skills:
            yield skill.id
            for lesson in skill.lessons:
                yield lesson.id
                for exercise in lesson.exercises:
                    yield exercise.id


class AchievementDef(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    color: str
    rule: Literal['xp', 'streak', 'lessons', 'perfect_lesson', 'legendary']
    threshold: int = Field(ge=1)


class RivalDef(BaseModel):
    id: str
    name: str
    avatar: str
    xp: int = Field(ge=0)


def _read(name: str):
    return json.loads((DATA_DIR / name).read_text(encoding='utf-8'))


@lru_cache(maxsize=1)
def course_packs() -> tuple[CoursePack, ...]:
    return tuple(CoursePack.model_validate(_read(f'{code}.json')) for code in _read('courses.json'))


@lru_cache(maxsize=1)
def achievement_defs() -> tuple[AchievementDef, ...]:
    return tuple(AchievementDef.model_validate(item) for item in _read('achievements.json'))


@lru_cache(maxsize=1)
def rival_defs() -> tuple[RivalDef, ...]:
    return tuple(RivalDef.model_validate(item) for item in _read('rivals.json'))
