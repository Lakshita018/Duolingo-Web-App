import itertools
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

WORKDIR = Path(tempfile.mkdtemp(prefix='duo-tests-'))
os.environ['DATABASE_URL'] = f"sqlite+aiosqlite:///{(WORKDIR / 'app.db').as_posix()}"
os.environ['DEV_TOOLS'] = 'true'
os.environ['BACKUP_BEFORE_MIGRATE'] = 'false'

import pytest
from fastapi.testclient import TestClient

from app.content.packs import course_packs
from app.main import app

SOLUTIONS = {
    exercise.id: (exercise.kind, exercise.solution)
    for pack in course_packs()
    for unit in pack.units
    for skill in unit.skills
    for lesson in skill.lessons
    for exercise in lesson.exercises
}

_counter = itertools.count(1)


def correct_answer(exercise_id: str):
    kind, solution = SOLUTIONS[exercise_id]
    if kind == 'match_pairs':
        return [dict(pair) for pair in solution['pairs']]
    if kind == 'translate_wordbank':
        return solution['answer'].split()
    return solution['answer']


def wrong_answer(exercise_id: str):
    kind, solution = SOLUTIONS[exercise_id]
    if kind == 'match_pairs':
        pairs = solution['pairs']
        return [{'left': pairs[0]['left'], 'right': pairs[1]['right']}, {'left': pairs[1]['left'], 'right': pairs[0]['right']}] + [
            dict(pair) for pair in pairs[2:]
        ]
    if kind == 'translate_wordbank':
        return ['zzz']
    return 'definitely-not-the-answer'


class Player:
    def __init__(self, client: TestClient, email: str):
        self.client = client
        self.email = email
        self.headers = {'X-Learner-Email': email}

    def get(self, path: str, **kwargs):
        return self.client.get(f'/api{path}', headers=self.headers, **kwargs)

    def post(self, path: str, **kwargs):
        return self.client.post(f'/api{path}', headers=self.headers, **kwargs)

    def me(self) -> dict:
        return self.get('/user').json()

    def course(self) -> dict:
        return self.get('/course').json()

    def start(self, lesson_id: str, mode: str = 'lesson'):
        return self.post(f'/lessons/{lesson_id}/attempts', json={'mode': mode})

    def answer(self, attempt_id: str, exercise_id: str, answer):
        return self.post(f'/attempts/{attempt_id}/answers', json={'exerciseId': exercise_id, 'answer': answer})

    def complete(self, attempt_id: str):
        return self.post(f'/attempts/{attempt_id}/complete')

    def play(self, lesson_id: str, mode: str = 'lesson', mistakes: int = 0) -> dict:
        started = self.start(lesson_id, mode)
        assert started.status_code == 201, started.text
        attempt = started.json()
        for index, exercise in enumerate(attempt['exercises']):
            value = wrong_answer(exercise['id']) if index < mistakes else correct_answer(exercise['id'])
            assert self.answer(attempt['attemptId'], exercise['id'], value).status_code == 200
        finished = self.complete(attempt['attemptId'])
        assert finished.status_code == 200, finished.text
        return finished.json()


@pytest.fixture(scope='session')
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def new_player(client):
    def build(language: str = 'Spanish', goal: int = 10) -> Player:
        email = f'learner{next(_counter)}@example.com'
        response = client.post(
            '/api/onboarding',
            json={
                'name': 'Test Learner',
                'email': email,
                'nativeLanguage': 'English',
                'targetLanguage': language,
                'proficiencyLevel': "I'm new to the language",
                'dailyGoal': goal,
            },
        )
        assert response.status_code == 200, response.text
        return Player(client, email)

    return build
