from .base import CamelModel


class LessonNodeOut(CamelModel):
    id: str
    title: str
    completed: bool
    playable: bool
    unlocked: bool


class SkillOut(CamelModel):
    id: str
    title: str
    icon: str
    description: str
    total_lessons: int
    lessons_completed: int
    crowns: int
    unlocked: bool
    finished: bool
    active_lesson_id: str | None
    lessons: list[LessonNodeOut]


class UnitOut(CamelModel):
    id: str
    title: str
    subtitle: str
    color: str
    color_dark: str
    skills: list[SkillOut]


class CourseOut(CamelModel):
    id: str
    language: str
    language_code: str
    flag: str
    units: list[UnitOut]
