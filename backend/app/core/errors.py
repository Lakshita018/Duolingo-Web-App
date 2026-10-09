from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class DomainError(Exception):
    status_code = 400
    code = 'bad_request'
    default_message = 'The request could not be completed'

    def __init__(self, message: str | None = None):
        self.message = message or self.default_message
        super().__init__(self.message)


class NotFound(DomainError):
    status_code = 404
    code = 'not_found'
    default_message = 'Resource not found'


class LearnerNotFound(NotFound):
    code = 'learner_not_found'
    default_message = "We couldn't find an account with that email. Let's get you started!"


class LessonNotFound(NotFound):
    code = 'lesson_not_found'
    default_message = 'Lesson not found'


class AttemptNotFound(NotFound):
    code = 'attempt_not_found'
    default_message = 'Lesson attempt not found'


class ExerciseNotFound(NotFound):
    code = 'exercise_not_found'
    default_message = 'Exercise not found'


class Forbidden(DomainError):
    status_code = 403
    code = 'forbidden'


class LessonLocked(Forbidden):
    code = 'lesson_locked'
    default_message = 'Finish the previous levels to unlock this lesson'


class LessonNotCompleted(Forbidden):
    code = 'lesson_not_completed'
    default_message = 'Complete this lesson before practising it'


class Conflict(DomainError):
    status_code = 409
    code = 'conflict'


class OutOfHearts(Conflict):
    code = 'out_of_hearts'
    default_message = 'You are out of hearts'


class AttemptClosed(Conflict):
    code = 'attempt_closed'
    default_message = 'This lesson attempt is no longer active'


class AttemptIncomplete(Conflict):
    code = 'attempt_incomplete'
    default_message = 'Answer every exercise before finishing the lesson'


class InsufficientGems(DomainError):
    code = 'insufficient_gems'


class Invalid(DomainError):
    status_code = 422
    code = 'invalid'


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def handle_domain_error(_: Request, exc: DomainError):
        return JSONResponse(status_code=exc.status_code, content={'detail': exc.message, 'code': exc.code})

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError):
        issues = [
            {'field': '.'.join(str(part) for part in err['loc'] if part not in ('body', 'query')), 'message': err['msg']}
            for err in exc.errors()
        ]
        first = issues[0] if issues else {'field': '', 'message': 'Invalid request'}
        label = f"{first['field']}: " if first['field'] else ''
        return JSONResponse(
            status_code=422,
            content={'detail': f"{label}{first['message']}", 'code': 'validation_error', 'issues': issues},
        )
