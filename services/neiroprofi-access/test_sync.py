import json
import unittest

import sync


def progress(done):
    return json.dumps({'version': 1, 'activeStep': done + 1, 'completed': list(range(1, done + 1)), 'score': done * 10})


class SyncTests(unittest.TestCase):
    def test_only_learning_keys_are_accepted(self):
        sync.check({'feya-academy-progress-v1:planner': progress(3), 'neiroprofi-results-v1': '{}'})
        for key in ('__Secure-neiroprofi', 'neiroprofi-personal-bot-v1', 'random'):
            with self.assertRaises(sync.SyncError):
                sync.check({key: '{}'})

    def test_values_must_be_strings_within_limits(self):
        with self.assertRaises(sync.SyncError):
            sync.check({'neiroprofi-results-v1': {'a': 1}})
        with self.assertRaises(sync.SyncError):
            sync.check({'neiroprofi-results-v1': 'x' * (sync.MAX_VALUE + 1)})

    def test_longer_progress_wins_in_both_directions(self):
        key = 'feya-academy-progress-v1:planner'
        self.assertEqual(sync.merge({key: progress(5)}, {key: progress(2)})[key], progress(5))
        self.assertEqual(sync.merge({key: progress(2)}, {key: progress(5)})[key], progress(5))

    def test_new_device_adds_its_own_projects(self):
        merged = sync.merge({'feya-academy-progress-v1:planner': progress(5)},
                            {'feya-academy-progress-v1:expert-site': progress(1)})
        self.assertEqual(sorted(merged), ['feya-academy-progress-v1:expert-site', 'feya-academy-progress-v1:planner'])

    def test_choices_and_cards_take_the_latest_value(self):
        merged = sync.merge({'neiroprofi-course-route-v1': '{"1":"old"}'}, {'neiroprofi-course-route-v1': '{"1":"new"}'})
        self.assertEqual(merged['neiroprofi-course-route-v1'], '{"1":"new"}')

    def test_broken_record_never_beats_a_real_one(self):
        key = 'feya-academy-progress-v1:planner'
        self.assertEqual(sync.merge({key: progress(4)}, {key: 'не json'})[key], progress(4))

    def test_summary_counts_steps_and_started_projects(self):
        entries = {
            'feya-academy-progress-v1:planner': progress(9),
            'feya-academy-progress-v1:expert-site': progress(2),
            'feya-academy-progress-v1:idea-vault': progress(0),
            'feya-academy-progress-v1:planner:legacy-20260908': progress(17),
            'neiroprofi-results-v1': '{}',
        }
        self.assertEqual(sync.summary(entries), {'steps': 11, 'projects': 2})


if __name__ == '__main__':
    unittest.main()
