from fastapi import APIRouter

from ..schemas.catalog import CourseOut
from ..services import progression
from .deps import CurrentLearner, Session

router = APIRouter(tags=['catalog'])


@router.get('/course', response_model=CourseOut)
async def get_course(session: Session, learner: CurrentLearner):
    return await progression.course_tree(session, learner)
