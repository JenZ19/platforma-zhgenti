import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class StudyTest(unittest.TestCase):
    def test_interface_has_boundaries_and_no_original_server_link(self):
        template = (ROOT / "hubcore/templates/base.html").read_text(encoding="utf-8")
        self.assertIn("не ставит диагнозов", template)
        self.assertNotIn("http://health-hub:8765", template)

    def test_original_import_and_duplicate_check(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "practice"
            result = subprocess.run([sys.executable, str(ROOT / "study_check.py"), "--output", str(target)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("PASS: 2", result.stdout)
            self.assertTrue((target / "inbox" / "study-lab.pdf").is_file())
            self.assertTrue((target / "data" / "health.db").is_file())
            # Re-running must not delete or overwrite somebody's existing workspace.
            again = subprocess.run([sys.executable, str(ROOT / "study_check.py"), "--output", str(target)], capture_output=True, text=True)
            self.assertNotEqual(again.returncode, 0)
            self.assertIn("already exists", again.stderr)


if __name__ == "__main__":
    unittest.main()
