from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.errors import LessonNotFound
from ..models import Course, Learner, Lesson, LessonProgress, Skill, Unit
from ..schemas.catalog import CourseOut, LessonNodeOut, SkillOut, UnitOut


@dataclass
class LessonState:
    lesson: Lesson
    completed: bool
    unlocked: bool


@dataclass
class SkillState:
    skill: Skill
    unlocked: bool
    finished: bool
    lessons: list[LessonState] = field(default_factory=list)

    @property
    def completed_count(self) -> int:
        return sum(1 for state in self.lessons if state.completed)

    @property
    def active_lesson_id(self) -> str | None:
        playable = [state for state in self.lessons if state.lesson.playable]
        if not playable:
            return None
        for state in playable:
            if not state.completed:
                return state.lesson.id
        return playable[-1].lesson.id


def evaluate_skills(units: list[Unit], completed: set[str]) -> dict[str, SkillState]:
    states: dict[str, SkillState] = {}
    previous_finished = True
    for unit in units:
        for skill in unit.skills:
            lessons: list[LessonState] = []
            blocked = False
            for lesson in skill.lessons:
                done = lesson.id in completed
                unlocked = lesson.playable and previous_finished and (done or not blocked)
                lessons.append(LessonState(lesson=lesson, completed=done, unlocked=unlocked))
                if lesson.playable and not done:
                    blocked = True
            playable = [state for state in lessons if state.lesson.playable]
            finished = bool(playable) and all(state.completed for state in playable)
            states[skill.id] = SkillState(skill=skill, unlocked=previous_finished, finished=finished, lessons=lessons)
            previous_finished = finished
    return states


async def completed_lessons(session: AsyncSession, learner: Learner) -> set[str]:
    rows = await session.scalars(select(LessonProgress.lesson_id).where(LessonProgress.learner_id == learner.id))
    return set(rows.all())


async def load_units(session: AsyncSession, course_code: str) -> list[Unit]:
    result = await session.scalars(
        select(Unit)
        .where(Unit.course_code == course_code)
        .options(selectinload(Unit.skills).selectinload(Skill.lessons))
        .order_by(Unit.position)
    )
    return list(result.all())


async def course_tree(session: AsyncSession, learner: Learner) -> CourseOut:
    course: Course = learner.course
    units = await load_units(session, course.code)
    states = evaluate_skills(units, await completed_lessons(session, learner))
    unit_payloads = []
    for unit in units:
        skills = []
        for skill in unit.skills:
            state = states[skill.id]
            skills.append(
                SkillOut(
                    id=skill.id,
                    title=skill.title,
                    icon=skill.icon,
                    description=skill.description,
                    total_lessons=len(state.lessons),
                    lessons_completed=state.completed_count,
                    crowns=int(state.finished),
                    unlocked=state.unlocked,
                    finished=state.finished,
                    active_lesson_id=state.active_lesson_id,
                    lessons=[
                        LessonNodeOut(
                            id=item.lesson.id,
                            title=item.lesson.title,
                            completed=item.completed,
                            playable=item.lesson.playable,
                            unlocked=item.unlocked,
                        )
                        for item in state.lessons
                    ],
                )
            )
        unit_payloads.append(
            UnitOut(
                id=unit.id,
                title=unit.title,
                subtitle=unit.subtitle,
                color=unit.color,
                color_dark=unit.color_dark,
                skills=skills,
            )
        )
    return CourseOut(
        id=f'{course.code}-101',
        language=course.name,
        language_code=course.code,
        flag=course.flag,
        units=unit_payloads,
    )


@dataclass
class LessonAccess:
    lesson: Lesson
    state: LessonState
    skill_state: SkillState


async def lesson_access(session: AsyncSession, learner: Learner, lesson_id: str) -> LessonAccess:
    lesson = await session.scalar(
        select(Lesson).where(Lesson.id == lesson_id).options(selectinload(Lesson.skill).selectinload(Skill.unit))
    )
    if lesson is None:
        raise LessonNotFound()
    units = await load_units(session, lesson.skill.unit.course_code)
    states = evaluate_skills(units, await completed_lessons(session, learner))
    skill_state = states[lesson.skill_id]
    state = next(item for item in skill_state.lessons if item.lesson.id == lesson_id)
    return LessonAccess(lesson=lesson, state=state, skill_state=skill_state)
