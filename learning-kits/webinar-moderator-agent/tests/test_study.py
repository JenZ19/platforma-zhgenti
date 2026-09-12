import asyncio
import json
import subprocess
import sys
import unittest
from unittest.mock import patch
from pathlib import Path


KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT))


class StudyKitTests(unittest.TestCase):
    def test_offline_report_uses_original_classifier_and_faq_rules(self):
        from study_check import build_report

        report = asyncio.run(build_report())
        by_text = {item["text"]: item for item in report["messages"]}

        self.assertEqual(by_text["+++ "]["category"], "reaction")
        self.assertEqual(by_text["https://example.test/reklama"]["category"], "spam")
        self.assertEqual(by_text["Будет ли запись?"]["category"], "other")
        self.assertEqual(by_text["Будет ли запись?"]["classified_by"], "fallback")
        self.assertTrue(report["faq_matches"][0]["matched"])
        self.assertFalse(report["faq_matches"][1]["matched"])
        self.assertEqual(report["network_calls"], 0)
        self.assertEqual(report["mode"], "observe")

    def test_cli_is_safe_and_json_serializable(self):
        proc = subprocess.run(
            [sys.executable, "study_check.py", "--json"],
            cwd=KIT,
            check=True,
            capture_output=True,
            text=True,
        )
        report = json.loads(proc.stdout)
        self.assertEqual(report["network_calls"], 0)
        self.assertFalse(report["live_integrations_started"])

    def test_live_runtime_is_locked_until_explicitly_enabled(self):
        sys.path.insert(0, str(KIT / "original_core"))
        from bot import build_app

        with patch.dict("os.environ", {"ENABLE_LIVE_INTEGRATIONS": ""}, clear=False):
            with self.assertRaisesRegex(SystemExit, "ENABLE_LIVE_INTEGRATIONS"):
                asyncio.run(build_app())
        with patch.dict("os.environ", {"ENABLE_LIVE_INTEGRATIONS": "I_UNDERSTAND"}, clear=False):
            with self.assertRaisesRegex(SystemExit, "ENABLE_LIVE_INTEGRATIONS"):
                asyncio.run(build_app())

    def test_offline_guard_rejects_socket_connections(self):
        from study_check import offline_network_guard

        with offline_network_guard():
            with self.assertRaisesRegex(RuntimeError, "Сеть заблокирована"):
                socket = __import__("socket").socket()
                try:
                    socket.connect(("127.0.0.1", 9))
                finally:
                    socket.close()


if __name__ == "__main__":
    unittest.main()
