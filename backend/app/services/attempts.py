import random
import uuid
from dataclasses import dataclass

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core import clock
from ..core.errors import (
    AttemptClosed,
    AttemptIncomplete,
    AttemptNotFound,
    ExerciseNotFound,
    LessonLocked,
    LessonNotCompleted,
    OutOfHearts,
)
from ..exercises import kind_for
from ..models import AttemptAnswer, Exercise, Learner, LessonAttempt, LessonProgress
from ..rules import RULES
from ..schemas.lessons import AnswerIn, AnswerOut, AttemptOut, SkillBannerOut
from . import achievements, progression, vitals


@dataclass
class Completion:
    attempt: LessonAttempt
    xp_earned: int
    crowns: int
    new_achievements: list[str]
    time_sec: int
    accuracy: int


def reward_for(mode: str, mistakes: int) -> int:
    if mode == 'practice':
        return RULES.practice_xp
    if mode == 'legendary':
        return RULES.legendary_xp
    return max(RULES.minimum_lesson_xp, RULES.lesson_xp - mistakes * RULES.xp_lost_per_mistake)


def accuracy_for(mistakes: int, total: int) -> int:
    return max(0, 100 - mistakes * 20) if total else 100


async def start(session: AsyncSession, learner: Learner, lesson_id: str, mode: str) -> AttemptOut:
    access = await progression.lesson_access(session, learner, lesson_id)
    if mode == 'lesson' and not access.state.unlocked:
        raise LessonLocked()
    if mode != 'lesson' and not access.state.completed:
        raise LessonNotCompleted()
    if mode != 'practice' and learner.stats.hearts <= 0:
        raise OutOfHearts()

    exercises = (
        await session.scalars(
            select(Exercise).where(Exercise.lesson_id == lesson_id).order_by(Exercise.position)
        )
    ).all()
    attempt_id = uuid.uuid4().hex
    ordered = list(exercises)
    if mode == 'legendary':
        random.Random(attempt_id).shuffle(ordered)

    now = clock.utcnow()
    await session.execute(
        update(LessonAttempt)
        .where(
            LessonAttempt.learner_id == learner.id,
            LessonAttempt.lesson_id == lesson_id,
            LessonAttempt.status == 'active',
        )
        .values(status='abandoned', finished_at=now)
    )
    session.add(
        LessonAttempt(
            id=attempt_id,
            learner_id=learner.id,
            lesson_id=lesson_id,
            mode=mode,
            status='active',
            exercise_order=[exercise.id for exercise in ordered],
            started_at=now,
        )
    )
    await session.flush()

    unit = access.lesson.skill.unit
    return AttemptOut(
        attempt_id=attempt_id,
        id=access.lesson.id,
        title=access.lesson.title,
        mode=mode,
        legendary=mode == 'legendary',
        skill=SkillBannerOut(
            id=access.lesson.skill.id,
            title=access.lesson.skill.title,
            color=unit.color,
            color_dark=unit.color_dark,
        ),
        exercises=[present_exercise(exercise, attempt_id) for exercise in ordered],
    )


def present_exercise(exercise: Exercise, attempt_id: str) -> dict:
    rng = random.Random(f'{attempt_id}:{exercise.id}')
    return {'id': exercise.id, 'type': exercise.kind, **kind_for(exercise.kind).present(exercise.spec, exercise.solution, rng)}


async def load_attempt(session: AsyncSession, learner: Learner, attempt_id: str) -> LessonAttempt:
    attempt = await session.scalar(
        select(LessonAttempt)
        .where(LessonAttempt.id == attempt_id, LessonAttempt.learner_id == learner.id)
        .options(selectinload(LessonAttempt.answers))
    )
    if attempt is None:
        raise AttemptNotFound()
    return attempt


def describe_answer(exercise: Exercise, correct: bool, learner: Learner, attempt: LessonAttempt) -> AnswerOut:
    kind = kind_for(exercise.kind)
    return AnswerOut(
        correct=correct,
        correct_answer=kind.reveal(exercise.solution),
        hearts=learner.stats.hearts,
        translation=kind.translation(exercise.spec),
        mistakes=attempt.mistakes,
        out_of_hearts=attempt.status == 'failed',
    )


async def answer(session: AsyncSession, learner: Learner, attempt_id: str, payload: AnswerIn) -> AnswerOut:
    attempt = await load_attempt(session, learner, attempt_id)
    if payload.exercise_id not in attempt.exercise_order:
        raise ExerciseNotFound()
    exercise = await session.get(Exercise, payload.exercise_id)
    if exercise is None:
        raise ExerciseNotFound()

    previous = next((item for item in attempt.answers if item.exercise_id == exercise.id), None)
    if previous is not None:
        return describe_answer(exercise, previous.correct, learner, attempt)
    if attempt.status != 'active':
        raise AttemptClosed()

    correct = kind_for(exercise.kind).grade(exercise.solution, payload.answer)
    attempt.answers.append(AttemptAnswer(exercise_id=exercise.id, correct=correct, answered_at=clock.utcnow()))
    if not correct:
        attempt.mistakes += 1
        if attempt.mode != 'practice':
            vitals.lose_heart(learner.stats, clock.utcnow())
            if learner.stats.hearts == 0:
                attempt.status = 'failed'
                attempt.finished_at = clock.utcnow()
    await session.flush()
    return describe_answer(exercise, correct, learner, attempt)


async def complete(session: AsyncSession, learner: Learner, attempt_id: str) -> Completion:
    attempt = await load_attempt(session, learner, attempt_id)
    total = len(attempt.exercise_order)
    if attempt.status == 'completed':
        return Completion(
            attempt=attempt,
            xp_earned=attempt.xp_awarded,
            crowns=await crowns_for(session, learner, attempt.lesson_id),
            new_achievements=[],
            time_sec=duration(attempt),
            accuracy=accuracy_for(attempt.mistakes, total),
        )
    if attempt.status == 'failed':
        raise OutOfHearts()
    if attempt.status != 'active':
        raise AttemptClosed()
    if len(attempt.answers) < total:
        raise AttemptIncomplete()

    now = clock.utcnow()
    xp = reward_for(attempt.mode, attempt.mistakes)
    attempt.status = 'completed'
    attempt.finished_at = now
    attempt.xp_awarded = xp
    seconds = duration(attempt)

    record = await session.get(LessonProgress, (learner.id, attempt.lesson_id))
    if record is None:
        session.add(
            LessonProgress(
                learner_id=learner.id,
                lesson_id=attempt.lesson_id,
                first_completed_at=now,
                last_completed_at=now,
                completions=1,
                best_mistakes=attempt.mistakes,
                last_time_sec=seconds,
            )
        )
    else:
        record.completions += 1
        record.last_completed_at = now
        record.best_mistakes = min(record.best_mistakes, attempt.mistakes)
        record.last_time_sec = seconds

    stats = learner.stats
    vitals.award_xp(stats, xp)
    stats.gems += RULES.gems_per_completion
    if attempt.mode == 'practice':
        vitals.gain_heart(stats)
    vitals.record_activity(stats, clock.today())
    await session.flush()

    standing = await achievements.standing_for(
        session,
        learner,
        perfect=attempt.mistakes == 0 and attempt.mode != 'practice',
        legendary=attempt.mode == 'legendary',
    )
    earned = await achievements.unlock_earned(session, learner, standing)
    return Completion(
        attempt=attempt,
        xp_earned=xp,
        crowns=await crowns_for(session, learner, attempt.lesson_id),
        new_achievements=earned,
        time_sec=seconds,
        accuracy=accuracy_for(attempt.mistakes, total),
    )


def duration(attempt: LessonAttempt) -> int:
    end = attempt.finished_at or clock.utcnow()
    return max(0, int((end - attempt.started_at).total_seconds()))


async def crowns_for(session: AsyncSession, learner: Learner, lesson_id: str) -> int:
    access = await progression.lesson_access(session, learner, lesson_id)
    return int(access.skill_state.finished)
