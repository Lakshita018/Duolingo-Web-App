from sqlalchemy import JSON, Boolean, CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.base import Base

EXERCISE_KINDS = ('multiple_choice', 'translate_wordbank', 'fill_blank', 'type_answer', 'match_pairs')


class Course(Base):
    __tablename__ = 'courses'

    code: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    flag: Mapped[str] = mapped_column(String)
    position: Mapped[int] = mapped_column(Integer, default=0)

    units: Mapped[list['Unit']] = relationship(
        back_populates='course', order_by='Unit.position', cascade='all, delete-orphan'
    )


class Unit(Base):
    __tablename__ = 'units'
    __table_args__ = (UniqueConstraint('course_code', 'position'),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    course_code: Mapped[str] = mapped_column(ForeignKey('courses.code', ondelete='CASCADE'), index=True)
    section: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String)
    subtitle: Mapped[str] = mapped_column(String)
    color: Mapped[str] = mapped_column(String)
    color_dark: Mapped[str] = mapped_column(String)
    position: Mapped[int] = mapped_column(Integer)

    course: Mapped[Course] = relationship(back_populates='units')
    skills: Mapped[list['Skill']] = relationship(
        back_populates='unit', order_by='Skill.position', cascade='all, delete-orphan'
    )


class Skill(Base):
    __tablename__ = 'skills'
    __table_args__ = (UniqueConstraint('unit_id', 'position'),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    unit_id: Mapped[str] = mapped_column(ForeignKey('units.id', ondelete='CASCADE'), index=True)
    title: Mapped[str] = mapped_column(String)
    icon: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String, default='')
    position: Mapped[int] = mapped_column(Integer)

    unit: Mapped[Unit] = relationship(back_populates='skills')
    lessons: Mapped[list['Lesson']] = relationship(
        back_populates='skill', order_by='Lesson.position', cascade='all, delete-orphan'
    )


class Lesson(Base):
    __tablename__ = 'lessons'
    __table_args__ = (UniqueConstraint('skill_id', 'position'),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    skill_id: Mapped[str] = mapped_column(ForeignKey('skills.id', ondelete='CASCADE'), index=True)
    title: Mapped[str] = mapped_column(String)
    position: Mapped[int] = mapped_column(Integer)
    playable: Mapped[bool] = mapped_column(Boolean, default=True)

    skill: Mapped[Skill] = relationship(back_populates='lessons')
    exercises: Mapped[list['Exercise']] = relationship(
        back_populates='lesson', order_by='Exercise.position', cascade='all, delete-orphan'
    )


class Exercise(Base):
    __tablename__ = 'exercises'
    __table_args__ = (
        UniqueConstraint('lesson_id', 'position'),
        CheckConstraint(
            'kind IN (' + ', '.join(f"'{kind}'" for kind in EXERCISE_KINDS) + ')', name='kind'
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey('lessons.id', ondelete='CASCADE'), index=True)
    kind: Mapped[str] = mapped_column(String)
    position: Mapped[int] = mapped_column(Integer)
    spec: Mapped[dict] = mapped_column(JSON)
    solution: Mapped[dict] = mapped_column(JSON)

    lesson: Mapped[Lesson] = relationship(back_populates='exercises')
