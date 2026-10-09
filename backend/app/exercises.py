import random
from abc import ABC, abstractmethod
from collections import Counter
from typing import Any

from pydantic import BaseModel, Field

from .core.text import fold

BLANK = '___'


class Option(BaseModel):
    text: str = Field(min_length=1)
    img: str | None = None


class Pair(BaseModel):
    left: str = Field(min_length=1)
    right: str = Field(min_length=1)


class MultipleChoiceSpec(BaseModel):
    prompt: str = Field(min_length=1)
    options: list[Option] = Field(min_length=2)


class FillBlankSpec(BaseModel):
    sentence: str = Field(min_length=1)
    options: list[str] = Field(min_length=2)
    translation: str | None = None


class WordBankSpec(BaseModel):
    prompt: str = Field(min_length=1)
    wordBank: list[str] = Field(min_length=2)


class TypeAnswerSpec(BaseModel):
    prompt: str = Field(min_length=1)
    hint: str | None = None


class PairsSpec(BaseModel):
    pass


class TextSolution(BaseModel):
    answer: str = Field(min_length=1)


class PairsSolution(BaseModel):
    pairs: list[Pair] = Field(min_length=2)


class ExerciseKind(ABC):
    name: str
    spec_model: type[BaseModel]
    solution_model: type[BaseModel]

    def parse(self, spec: dict, solution: dict) -> tuple[BaseModel, BaseModel]:
        parsed_spec = self.spec_model.model_validate(spec)
        parsed_solution = self.solution_model.model_validate(solution)
        self.check_integrity(parsed_spec, parsed_solution)
        return parsed_spec, parsed_solution

    @abstractmethod
    def check_integrity(self, spec: Any, solution: Any) -> None: ...

    def present(self, spec: dict, solution: dict, rng: random.Random) -> dict:
        return dict(spec)

    @abstractmethod
    def grade(self, solution: dict, answer: Any) -> bool: ...

    def reveal(self, solution: dict) -> Any:
        return solution['answer']

    def translation(self, spec: dict) -> str | None:
        return spec.get('translation')


class MultipleChoiceKind(ExerciseKind):
    name = 'multiple_choice'
    spec_model = MultipleChoiceSpec
    solution_model = TextSolution

    def check_integrity(self, spec: MultipleChoiceSpec, solution: TextSolution) -> None:
        folded = [fold(option.text) for option in spec.options]
        if len(set(folded)) != len(folded):
            raise ValueError('options must be distinct')
        if fold(solution.answer) not in folded:
            raise ValueError('answer must be one of the options')

    def grade(self, solution: dict, answer: Any) -> bool:
        return isinstance(answer, str) and fold(answer) == fold(solution['answer'])


class FillBlankKind(ExerciseKind):
    name = 'fill_blank'
    spec_model = FillBlankSpec
    solution_model = TextSolution

    def check_integrity(self, spec: FillBlankSpec, solution: TextSolution) -> None:
        if spec.sentence.count(BLANK) != 1:
            raise ValueError('sentence must contain exactly one blank')
        folded = [fold(option) for option in spec.options]
        if len(set(folded)) != len(folded):
            raise ValueError('options must be distinct')
        if fold(solution.answer) not in folded:
            raise ValueError('answer must be one of the options')

    def grade(self, solution: dict, answer: Any) -> bool:
        return isinstance(answer, str) and fold(answer) == fold(solution['answer'])


class TypeAnswerKind(ExerciseKind):
    name = 'type_answer'
    spec_model = TypeAnswerSpec
    solution_model = TextSolution

    def check_integrity(self, spec: TypeAnswerSpec, solution: TextSolution) -> None:
        if not fold(solution.answer):
            raise ValueError('answer must contain letters')

    def grade(self, solution: dict, answer: Any) -> bool:
        return isinstance(answer, str) and fold(answer) == fold(solution['answer'])


class WordBankKind(ExerciseKind):
    name = 'translate_wordbank'
    spec_model = WordBankSpec
    solution_model = TextSolution

    def check_integrity(self, spec: WordBankSpec, solution: TextSolution) -> None:
        needed = Counter(fold(solution.answer).split())
        available = Counter(fold(word) for word in spec.wordBank)
        missing = needed - available
        if missing:
            raise ValueError(f'word bank is missing {sorted(missing)}')

    def grade(self, solution: dict, answer: Any) -> bool:
        if isinstance(answer, list) and all(isinstance(word, str) for word in answer):
            answer = ' '.join(answer)
        return isinstance(answer, str) and fold(answer) == fold(solution['answer'])


class MatchPairsKind(ExerciseKind):
    name = 'match_pairs'
    spec_model = PairsSpec
    solution_model = PairsSolution

    def check_integrity(self, spec: PairsSpec, solution: PairsSolution) -> None:
        lefts = [fold(pair.left) for pair in solution.pairs]
        rights = [fold(pair.right) for pair in solution.pairs]
        if len(set(lefts)) != len(lefts) or len(set(rights)) != len(rights):
            raise ValueError('pairs must be distinct on both sides')

    def present(self, spec: dict, solution: dict, rng: random.Random) -> dict:
        lefts = [pair['left'] for pair in solution['pairs']]
        rights = [pair['right'] for pair in solution['pairs']]
        rng.shuffle(rights)
        return {'lefts': lefts, 'rights': rights, 'pairsCount': len(lefts)}

    def grade(self, solution: dict, answer: Any) -> bool:
        if not isinstance(answer, list):
            return False
        expected = {fold(pair['left']): fold(pair['right']) for pair in solution['pairs']}
        given: dict[str, str] = {}
        for item in answer:
            left = getattr(item, 'left', None) if not isinstance(item, dict) else item.get('left')
            right = getattr(item, 'right', None) if not isinstance(item, dict) else item.get('right')
            if not isinstance(left, str) or not isinstance(right, str):
                return False
            given[fold(left)] = fold(right)
        return len(answer) == len(expected) and given == expected

    def reveal(self, solution: dict) -> Any:
        return solution['pairs']

    def translation(self, spec: dict) -> str | None:
        return None


KINDS: dict[str, ExerciseKind] = {
    kind.name: kind
    for kind in (MultipleChoiceKind(), FillBlankKind(), TypeAnswerKind(), WordBankKind(), MatchPairsKind())
}


def kind_for(name: str) -> ExerciseKind:
    try:
        return KINDS[name]
    except KeyError as error:
        raise ValueError(f'Unknown exercise kind: {name}') from error
