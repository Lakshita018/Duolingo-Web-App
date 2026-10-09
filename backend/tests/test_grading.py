import random

import pytest

from app.content.packs import course_packs
from app.core.text import fold
from app.exercises import KINDS


def test_fold_ignores_latin_accents_case_and_punctuation():
    assert fold('¿Cómo estás?') == fold('como estas')
    assert fold('  Buenos   DÍAS ') == 'buenos dias'
    assert fold('l’addition') == fold("l'addition")


def test_fold_keeps_devanagari_vowel_signs_distinct():
    assert fold('हैं') != fold('है')
    assert fold('हूँ') != fold('हैं')
    assert fold('हिंदी') != fold('हंदी')
    assert fold('मैं ठीक हूँ।') == fold('मैं ठीक हूँ')


def test_every_hindi_choice_has_exactly_one_accepted_option():
    for pack in course_packs():
        for unit in pack.units:
            for skill in unit.skills:
                for lesson in skill.lessons:
                    for exercise in lesson.exercises:
                        if exercise.kind == 'fill_blank':
                            options = exercise.spec['options']
                        elif exercise.kind == 'multiple_choice':
                            options = [option['text'] for option in exercise.spec['options']]
                        else:
                            continue
                        grader = KINDS[exercise.kind]
                        accepted = [option for option in options if grader.grade(exercise.solution, option)]
                        assert accepted == [exercise.solution['answer']], exercise.id


def test_content_catalogue_shape():
    packs = {pack.code: pack for pack in course_packs()}
    assert set(packs) == {'es', 'fr', 'hi'}
    for pack in packs.values():
        exercises = [
            exercise
            for unit in pack.units
            for skill in unit.skills
            for lesson in skill.lessons
            for exercise in lesson.exercises
        ]
        assert len(exercises) == 40
        assert {exercise.kind for exercise in exercises} == set(KINDS)
        assert [len(unit.skills) for unit in pack.units] == [2, 0, 0]


def test_word_bank_accepts_list_or_sentence_and_rejects_wrong_order():
    solution = {'answer': 'je mange du pain'}
    kind = KINDS['translate_wordbank']
    assert kind.grade(solution, ['je', 'mange', 'du', 'pain'])
    assert kind.grade(solution, 'Je mange du pain.')
    assert not kind.grade(solution, ['mange', 'je', 'du', 'pain'])
    assert not kind.grade(solution, '')


def test_match_pairs_requires_complete_exact_mapping():
    solution = {'pairs': [{'left': 'a', 'right': '1'}, {'left': 'b', 'right': '2'}]}
    kind = KINDS['match_pairs']
    assert kind.grade(solution, [{'left': 'b', 'right': '2'}, {'left': 'a', 'right': '1'}])
    assert not kind.grade(solution, [{'left': 'a', 'right': '2'}, {'left': 'b', 'right': '1'}])
    assert not kind.grade(solution, [{'left': 'a', 'right': '1'}])
    assert not kind.grade(solution, [{'left': 'a', 'right': '1'}, {'left': 'a', 'right': '1'}])
    assert not kind.grade(solution, '')


def test_match_pairs_presentation_hides_pairing_but_keeps_all_sides():
    solution = {'pairs': [{'left': str(i), 'right': f'r{i}'} for i in range(6)]}
    shown = KINDS['match_pairs'].present({}, solution, random.Random(1))
    assert shown['lefts'] == [str(i) for i in range(6)]
    assert sorted(shown['rights']) == sorted(f'r{i}' for i in range(6))
    assert shown['pairsCount'] == 6
    assert 'pairs' not in shown


@pytest.mark.parametrize('answer', [None, '', [], {'x': 1}, 3])
def test_malformed_answers_are_simply_wrong(answer):
    for name, kind in KINDS.items():
        solution = {'pairs': [{'left': 'a', 'right': '1'}, {'left': 'b', 'right': '2'}]} if name == 'match_pairs' else {'answer': 'x'}
        assert kind.grade(solution, answer) is False
