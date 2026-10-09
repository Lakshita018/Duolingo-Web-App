import os
import sqlite3

import pytest

from conftest import SOLUTIONS, Player, correct_answer, wrong_answer

LANGUAGES = [('Spanish', 'es'), ('French', 'fr'), ('Hindi', 'hi')]


def skill_nodes(course: dict) -> list[dict]:
    return [skill for unit in course['units'] for skill in unit['skills']]


@pytest.mark.parametrize('language,code', LANGUAGES)
def test_full_learning_path_for_each_language(new_player, language, code):
    player = new_player(language)
    me = player.me()
    assert (me['targetLanguage'], me['language'], me['hearts'], me['xp']) == (language, code, 5, 0)

    course = player.course()
    assert course['languageCode'] == code and course['id'] == f'{code}-101'
    assert [unit['id'] for unit in course['units']] == [f'{code}-u1', f'{code}-u2', f'{code}-u3']
    greetings, food = skill_nodes(course)
    assert (greetings['unlocked'], food['unlocked']) == (True, False)
    assert [lesson['unlocked'] for lesson in greetings['lessons']] == [True, False, False, False]
    assert greetings['activeLessonId'] == f'{code}-s1-l1'

    first = player.play(f'{code}-s1-l1')
    assert first['xpEarned'] == 15 and first['mistakes'] == 0 and first['accuracy'] == 100
    assert first['user']['xp'] == 15 and first['user']['gems'] == 505 and first['user']['streak'] == 1
    assert set(first['newAchievements']) == {'first', 'noMiss'}

    greetings, food = skill_nodes(player.course())
    assert greetings['lessonsCompleted'] == 1 and food['unlocked'] is False
    assert greetings['lessons'][1]['unlocked'] is True

    second = player.play(f'{code}-s1-l2', mistakes=2)
    assert second['xpEarned'] == 11 and second['mistakes'] == 2
    assert second['skillCrowns'] == 1 and second['user']['hearts'] == 3

    greetings, food = skill_nodes(player.course())
    assert greetings['finished'] is True and greetings['crowns'] == 1
    assert food['unlocked'] is True and food['lessons'][0]['unlocked'] is True
    assert greetings['lessons'][2]['playable'] is False

    third = player.play(f'{code}-s2-l1')
    assert third['user']['lessonProgress'][f'{code}-s2-l1']['completed'] is True
    assert third['user']['skillProgress'][f'{code}-s1']['crowns'] == 1


def test_all_exercise_types_are_served_without_answers(new_player):
    player = new_player('French')
    attempt = player.start('fr-s1-l1').json()
    assert [exercise['type'] for exercise in attempt['exercises']] == [
        'multiple_choice',
        'translate_wordbank',
        'fill_blank',
        'type_answer',
        'match_pairs',
    ]
    for exercise in attempt['exercises']:
        assert 'correctAnswer' not in exercise and 'answer' not in exercise and 'solution' not in exercise
    pairs = attempt['exercises'][4]
    assert len(pairs['lefts']) == len(pairs['rights']) == pairs['pairsCount'] == 4
    assert attempt['skill']['color'] == '#58cc02' and attempt['legendary'] is False


def test_wrong_answer_costs_a_heart_and_reveals_the_solution(new_player):
    player = new_player('Spanish')
    attempt = player.start('es-s1-l1').json()
    mc = attempt['exercises'][0]['id']
    result = player.answer(attempt['attemptId'], mc, wrong_answer(mc)).json()
    assert result['correct'] is False and result['hearts'] == 4
    assert result['correctAnswer'] == correct_answer(mc)
    again = player.answer(attempt['attemptId'], mc, correct_answer(mc)).json()
    assert again['correct'] is False and again['hearts'] == 4
    assert player.me()['hearts'] == 4

    pairs = attempt['exercises'][4]['id']
    shown = player.answer(attempt['attemptId'], pairs, wrong_answer(pairs)).json()
    assert shown['correctAnswer'] == SOLUTIONS[pairs][1]['pairs']

    fill = attempt['exercises'][2]['id']
    assert player.answer(attempt['attemptId'], fill, correct_answer(fill)).json()['translation']


def test_losing_every_heart_fails_the_attempt(new_player):
    player = new_player('Spanish')
    attempt = player.start('es-s1-l1').json()
    ids = [exercise['id'] for exercise in attempt['exercises']]
    last = None
    for exercise_id in ids:
        last = player.answer(attempt['attemptId'], exercise_id, wrong_answer(exercise_id)).json()
    assert last['hearts'] == 0 and last['outOfHearts'] is True
    blocked = player.complete(attempt['attemptId'])
    assert blocked.status_code == 409 and blocked.json()['code'] == 'out_of_hearts'
    assert player.start('es-s1-l1').json()['code'] == 'out_of_hearts'
    assert player.me()['xp'] == 0


def test_hearts_refill_costs_gems_and_is_noop_when_full(new_player):
    player = new_player('Spanish')
    assert player.post('/hearts/refill', json={'method': 'gems'}).json()['message'] == 'Hearts already full'
    attempt = player.start('es-s1-l1').json()
    for exercise in attempt['exercises'][:2]:
        player.answer(attempt['attemptId'], exercise['id'], wrong_answer(exercise['id']))
    assert player.me()['hearts'] == 3
    refill = player.post('/hearts/refill', json={'method': 'gems'}).json()
    assert refill['user']['hearts'] == 5 and refill['user']['gems'] == 150 and refill['user']['heartsRegenAt'] is None
    assert player.post('/hearts/refill', json={'method': 'ad'}).status_code == 422


def test_hearts_refill_requires_enough_gems(new_player):
    player = new_player('Spanish')
    attempt = player.start('es-s1-l1').json()
    player.answer(attempt['attemptId'], attempt['exercises'][0]['id'], 'nope')
    assert player.post('/hearts/refill', json={'method': 'gems'}).status_code == 200
    attempt = player.start('es-s1-l1').json()
    player.answer(attempt['attemptId'], attempt['exercises'][0]['id'], 'nope')
    denied = player.post('/hearts/refill', json={'method': 'gems'})
    assert denied.status_code == 400 and 'Need 200 more' in denied.json()['detail']


def test_locks_are_enforced_by_the_server(new_player):
    player = new_player('Spanish')
    assert player.start('es-s1-l2').json()['code'] == 'lesson_locked'
    assert player.start('es-s2-l1').json()['code'] == 'lesson_locked'
    assert player.start('es-s1-l3').json()['code'] == 'lesson_locked'
    assert player.start('es-s1-l1', 'practice').json()['code'] == 'lesson_not_completed'
    assert player.start('es-s1-l1', 'legendary').json()['code'] == 'lesson_not_completed'
    assert player.start('missing').status_code == 404


def test_practice_is_free_and_refunds_a_heart_while_legendary_costs_hearts(new_player):
    player = new_player('Spanish')
    player.play('es-s1-l1', mistakes=1)
    assert player.me()['hearts'] == 4

    practice = player.play('es-s1-l1', 'practice', mistakes=3)
    assert practice['xpEarned'] == 5 and practice['user']['hearts'] == 5
    assert practice['user']['xp'] == 13 + 5

    attempt = player.start('es-s1-l1', 'practice').json()
    exercise = attempt['exercises'][0]['id']
    assert player.answer(attempt['attemptId'], exercise, 'nope').json()['hearts'] == 5

    legendary = player.start('es-s1-l1', 'legendary').json()
    assert legendary['legendary'] is True
    assert sorted(item['id'] for item in legendary['exercises']) == sorted(f'es-s1-l1-e{i}' for i in range(1, 6))
    first = legendary['exercises'][0]['id']
    assert player.answer(legendary['attemptId'], first, 'nope').json()['hearts'] == 4
    for item in legendary['exercises'][1:]:
        player.answer(legendary['attemptId'], item['id'], correct_answer(item['id']))
    player.answer(legendary['attemptId'], first, correct_answer(first))
    done = player.complete(legendary['attemptId']).json()
    assert done['xpEarned'] == 40 and 'legendary' in done['newAchievements']


def test_completion_is_idempotent_and_requires_every_answer(new_player):
    player = new_player('Hindi')
    attempt = player.start('hi-s1-l1').json()
    assert player.complete(attempt['attemptId']).json()['code'] == 'attempt_incomplete'
    for exercise in attempt['exercises']:
        player.answer(attempt['attemptId'], exercise['id'], correct_answer(exercise['id']))
    first = player.complete(attempt['attemptId']).json()
    second = player.complete(attempt['attemptId']).json()
    assert first['xpEarned'] == second['xpEarned'] == 15
    assert second['newAchievements'] == []
    assert player.me()['xp'] == 15 and player.me()['gems'] == 505
    late = player.answer(attempt['attemptId'], attempt['exercises'][0]['id'], 'x')
    assert late.json()['correct'] is True


def test_attempts_belong_to_their_learner(new_player):
    owner, intruder = new_player('Spanish'), new_player('Spanish')
    attempt = owner.start('es-s1-l1').json()
    exercise = attempt['exercises'][0]['id']
    assert intruder.answer(attempt['attemptId'], exercise, 'x').status_code == 404
    assert intruder.complete(attempt['attemptId']).status_code == 404


def test_client_supplied_scores_are_ignored(new_player):
    player = new_player('Spanish')
    attempt = player.start('es-s1-l1').json()
    for exercise in attempt['exercises']:
        player.answer(attempt['attemptId'], exercise['id'], correct_answer(exercise['id']))
    result = player.post(
        f"/attempts/{attempt['attemptId']}/complete",
        json={'xpEarned': 9999, 'mistakes': 0, 'timeSec': 1},
    ).json()
    assert result['xpEarned'] == 15


def test_best_mistakes_are_kept_across_replays(new_player):
    player = new_player('Spanish')
    player.play('es-s1-l1', mistakes=0)
    player.play('es-s1-l1', mistakes=2)
    assert player.me()['lessonProgress']['es-s1-l1']['mistakes'] == 0


def test_learners_are_isolated_and_share_the_leaderboard(new_player):
    one, two = new_player('Spanish'), new_player('French')
    one.play('es-s1-l1')
    assert one.me()['xp'] == 15 and two.me()['xp'] == 0
    assert two.course()['languageCode'] == 'fr'
    board = one.get('/leaderboard').json()
    me = [row for row in board['users'] if row['isMe']]
    assert len(board['users']) == 5 and len(me) == 1 and me[0]['id'] == one.me()['id']
    assert [row['rank'] for row in board['users']][:4] == [1, 2, 3, 4]
    assert me[0]['rank'] > 4


def test_leaderboard_lifts_the_learner_into_the_top_five(new_player):
    player = new_player('Spanish')
    learner_id = player.me()['id']
    path = os.environ['DATABASE_URL'].split(':///', 1)[1]
    with sqlite3.connect(path) as connection:
        connection.execute('UPDATE learner_stats SET xp = 3000 WHERE learner_id = ?', (learner_id,))
    board = player.get('/leaderboard').json()
    assert board['league'] == 'Bronze' and len(board['users']) == 5
    assert board['users'][0]['isMe'] is True and board['users'][0]['rank'] == 1
    assert [row['name'] for row in board['users'][1:]] == ['Maya', 'Lucas', 'Amara', 'Noah']


def test_achievements_report_progress(new_player):
    player = new_player('Spanish')
    before = {item['id']: item for item in player.get('/achievements').json()['achievements']}
    assert len(before) == 7 and not any(item['unlocked'] for item in before.values())
    player.play('es-s1-l1')
    after = {item['id']: item for item in player.get('/achievements').json()['achievements']}
    assert after['first']['unlocked'] and after['noMiss']['unlocked']
    assert after['xp50']['progress'] == 15 and after['xp50']['ruleValue'] == 50 and not after['xp50']['unlocked']
    assert sorted(player.me()['achievements']) == ['first', 'noMiss']


def test_profile_updates_and_validation(new_player):
    player = new_player('Spanish')
    updated = player.post('/user', json={'name': '  Ana  ', 'avatar': 'avatar-moon', 'theme': 'dark', 'dailyGoal': 20}).json()
    assert (updated['name'], updated['avatar'], updated['theme'], updated['dailyGoal']) == ('Ana', 'avatar-moon', 'dark', 20)
    assert player.post('/user', json={'theme': 'neon'}).status_code == 422
    assert player.post('/user', json={'name': '   '}).status_code == 422
    assert player.post('/user', json={'dailyGoal': 500}).status_code == 422
    assert player.me()['theme'] == 'dark'


def test_onboarding_and_login_rules(client, new_player):
    player = new_player('Hindi')
    found = client.get('/api/user/by-email', params={'email': player.email.upper()})
    assert found.status_code == 200 and found.json()['targetLanguage'] == 'Hindi'
    missing = client.get('/api/user/by-email', params={'email': 'ghost@example.com'})
    assert missing.status_code == 404 and missing.json()['code'] == 'learner_not_found'
    bad = client.post(
        '/api/onboarding',
        json={'name': 'X', 'email': 'not-an-email', 'targetLanguage': 'Spanish', 'proficiencyLevel': 'new'},
    )
    assert bad.status_code == 422 and 'valid email' in bad.json()['detail']
    unsupported = client.post(
        '/api/onboarding',
        json={'name': 'X', 'email': 'x@example.com', 'targetLanguage': 'Klingon', 'proficiencyLevel': 'new'},
    )
    assert unsupported.status_code == 422 and 'Spanish' in unsupported.json()['detail']
    assert client.get('/api/user', headers={'X-Learner-Email': 'ghost@example.com'}).status_code == 404

    again = client.post(
        '/api/onboarding',
        json={'name': 'Renamed', 'email': player.email, 'targetLanguage': 'French', 'proficiencyLevel': 'some'},
    ).json()
    assert again['id'] == found.json()['id'] and again['name'] == 'Renamed' and again['language'] == 'fr'


def test_dev_tools_advance_the_day_and_reset_only_the_current_learner(new_player):
    player, bystander = new_player('Spanish'), new_player('Spanish')
    player.play('es-s1-l1')
    bystander.play('es-s1-l1')
    advanced = player.post('/dev/advance-day').json()
    assert advanced['dailyXp'] == 0 and advanced['streak'] == 1
    player.play('es-s1-l1', 'practice')
    assert player.me()['streak'] == 2
    reset = player.post('/dev/reset').json()
    assert reset['xp'] == 0 and reset['lessonProgress'] == {} and reset['achievements'] == []
    assert bystander.me()['xp'] == 15


def test_health_and_unknown_route(client):
    assert client.get('/api/health').json()['ok'] is True
    assert client.get('/api/lesson/es-s1-l1').status_code == 404
