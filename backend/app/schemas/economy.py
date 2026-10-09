from typing import Literal

from .base import CamelModel
from .learner import LearnerOut


class RefillIn(CamelModel):
    method: Literal['gems'] = 'gems'


class RefillOut(CamelModel):
    ok: bool = True
    user: LearnerOut
    message: str | None = None
