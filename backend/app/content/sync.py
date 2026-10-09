import logging
from collections.abc import Iterable
from typing import TypeVar

from sqlalchemy import delete, select, union
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import (
    Achievement,
    Course,
    Exercise,
    Lesson,
    LessonAttempt,
    LessonProgress,
    Rival,
    Skill,
    Unit,
)
from .packs import CoursePack, achievement_defs, course_packs, rival_defs

log = logging.getLogger(__name__)

Row = TypeVar('Row')


async def _index(session: AsyncSession, model: type[Row], key: str = 'id') -> dict[str, Row]:
    return {getattr(row, key): row for row in (await session.scalars(select(model))).all()}


def _assign(row: object, **values: object) -> None:
    for key, value in values.items():
        if getattr(row, key) != value:
            setattr(row, key, value)


async def _sync_pack(session: AsyncSession, pack: CoursePack, position: int, rows: dict[str, dict]) -> None:
    course = rows['courses'].get(pack.code)
    if course is None:
        course = Course(code=pack.code, name=pack.name, flag=pack.flag, position=position)
        session.add(course)
        rows['courses'][pack.code] = course
    else:
        _assign(course, name=pack.name, flag=pack.flag, position=position)
    await session.flush()

    for unit_position, unit_def in enumerate(pack.units):
        unit = rows['units'].get(unit_def.id)
        values = dict(
            course_code=pack.code,
            section=unit_def.section,
            title=unit_def.title,
            subtitle=unit_def.subtitle,
            color=unit_def.color,
            color_dark=unit_def.colorDark,
            position=unit_position,
        )
        if unit is None:
            unit = Unit(id=unit_def.id, **values)
            session.add(unit)
            rows['units'][unit.id] = unit
        else:
            _assign(unit, **values)
        await session.flush()

        for skill_position, skill_def in enumerate(unit_def.skills):
            skill = rows['skills'].get(skill_def.id)
            values = dict(
                unit_id=unit_def.id,
                title=skill_def.title,
                icon=skill_def.icon,
                description=skill_def.description,
                position=skill_position,
            )
            if skill is None:
                skill = Skill(id=skill_def.id, **values)
                session.add(skill)
                rows['skills'][skill.id] = skill
            else:
                _assign(skill, **values)
            await session.flush()

            for lesson_position, lesson_def in enumerate(skill_def.lessons):
                lesson = rows['lessons'].get(lesson_def.id)
                values = dict(
                    skill_id=skill_def.id,
                    title=lesson_def.title,
                    position=lesson_position,
                    playable=lesson_def.playable,
                )
                if lesson is None:
                    lesson = Lesson(id=lesson_def.id, **values)
                    session.add(lesson)
                    rows['lessons'][lesson.id] = lesson
                else:
                    _assign(lesson, **values)
                await session.flush()

                for exercise_position, exercise_def in enumerate(lesson_def.exercises):
                    exercise = rows['exercises'].get(exercise_def.id)
                    values = dict(
                        lesson_id=lesson_def.id,
                        kind=exercise_def.kind,
                        position=exercise_position,
                        spec=exercise_def.spec,
                        solution=exercise_def.solution,
                    )
                    if exercise is None:
                        exercise = Exercise(id=exercise_def.id, **values)
                        session.add(exercise)
                        rows['exercises'][exercise.id] = exercise
                    else:
                        _assign(exercise, **values)
                await session.flush()


def _ids(packs: Iterable[CoursePack]) -> dict[str, set[str]]:
    found: dict[str, set[str]] = {'units': set(), 'skills': set(), 'lessons': set(), 'exercises': set()}
    for pack in packs:
        for unit in pack.units:
            found['units'].add(unit.id)
            for skill in unit.skills:
                found['skills'].add(skill.id)
                for lesson in skill.lessons:
                    found['lessons'].add(lesson.id)
                    found['exercises'].update(exercise.id for exercise in lesson.exercises)
    return found


async def _retire_stale(session: AsyncSession, rows: dict[str, dict], keep: dict[str, set[str]]) -> None:
    history = union(select(LessonProgress.lesson_id), select(LessonAttempt.lesson_id))
    referenced = set((await session.scalars(history)).all())
    stale_lessons = {lesson_id for lesson_id in rows['lessons'] if lesson_id not in keep['lessons']}
    removable = stale_lessons - referenced
    if stale_lessons - removable:
        log.warning('Keeping %d retired lessons that still have learner history', len(stale_lessons - removable))
    if removable:
        await session.execute(delete(Lesson).where(Lesson.id.in_(removable)))
    dropped = [
        exercise_id
        for exercise_id, row in rows['exercises'].items()
        if exercise_id not in keep['exercises'] and row.lesson_id in keep['lessons']
    ]
    if dropped:
        await session.execute(delete(Exercise).where(Exercise.id.in_(dropped)))
    await session.flush()

    stale_skills = [skill_id for skill_id in rows['skills'] if skill_id not in keep['skills']]
    if stale_skills:
        await session.execute(
            delete(Skill).where(Skill.id.in_(stale_skills), Skill.id.not_in(select(Lesson.skill_id)))
        )
    stale_units = [unit_id for unit_id in rows['units'] if unit_id not in keep['units']]
    if stale_units:
        await session.execute(
            delete(Unit).where(Unit.id.in_(stale_units), Unit.id.not_in(select(Skill.unit_id)))
        )


async def sync_catalog(session: AsyncSession) -> None:
    packs = course_packs()
    rows = {
        'courses': await _index(session, Course, 'code'),
        'units': await _index(session, Unit),
        'skills': await _index(session, Skill),
        'lessons': await _index(session, Lesson),
        'exercises': await _index(session, Exercise),
    }
    for position, pack in enumerate(packs):
        await _sync_pack(session, pack, position, rows)
    await _retire_stale(session, rows, _ids(packs))
    await session.flush()


async def sync_reference_data(session: AsyncSession) -> None:
    existing = await _index(session, Achievement)
    for position, definition in enumerate(achievement_defs()):
        values = dict(
            title=definition.title,
            description=definition.description,
            icon=definition.icon,
            color=definition.color,
            rule=definition.rule,
            threshold=definition.threshold,
            position=position,
        )
        row = existing.get(definition.id)
        if row is None:
            session.add(Achievement(id=definition.id, **values))
        else:
            _assign(row, **values)

    rivals = await _index(session, Rival)
    wanted = {definition.id for definition in rival_defs()}
    for definition in rival_defs():
        row = rivals.get(definition.id)
        if row is None:
            session.add(Rival(id=definition.id, name=definition.name, avatar=definition.avatar, xp=definition.xp))
        else:
            _assign(row, name=definition.name, avatar=definition.avatar, xp=definition.xp)
    stale = [rid for rid in rivals if rid not in wanted]
    if stale:
        await session.execute(delete(Rival).where(Rival.id.in_(stale)))
    await session.flush()
