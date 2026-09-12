import json
import os
import subprocess
import sys
import tempfile
import unittest
import hashlib
from pathlib import Path


KIT = Path(__file__).resolve().parents[1]
SOURCE = KIT / "source"
sys.path.insert(0, str(SOURCE))


class CarouselLearningKitTests(unittest.TestCase):
    def test_access_is_by_configured_numeric_ids_and_closed_by_default(self):
        from access_control import configured_ids, is_allowed, safe_state_dir

        self.assertEqual(configured_ids("101, -202"), {101, -202})
        self.assertFalse(is_allowed(101, None, set(), set()))
        self.assertTrue(is_allowed(101, None, {101}, set()))
        self.assertTrue(is_allowed(999, -202, set(), {-202}))
        self.assertFalse(is_allowed(999, -303, {101}, {-202}))
        original = Path.home() / ".local" / "share" / "carousel-bot"
        with self.assertRaises(ValueError):
            safe_state_dir(original, KIT)
        self.assertEqual(safe_state_dir(KIT / "runtime-data", KIT), (KIT / "runtime-data").resolve())

    def test_bot_ignores_inherited_secrets_and_uses_isolated_default_state(self):
        code = (SOURCE / "bot.py").read_text(encoding="utf-8")
        self.assertIn('dotenv_values(KIT_ROOT / ".env")', code)
        self.assertIn("os.environ.pop(name, None)", code)
        self.assertIn('KIT_ROOT / "runtime-data"', code)
        self.assertNotIn('Path.home() / ".local/share/carousel-bot"', code)
        transcribe = (SOURCE / "transcribe.py").read_text(encoding="utf-8")
        self.assertNotIn("load_dotenv()", transcribe)

    def test_original_style_registry_is_preserved(self):
        from carousel_generator import STYLES, THEMES

        self.assertEqual(
            list(STYLES),
            [
                "editorial", "poster", "neon", "pastel", "notebook",
                "swiss", "fashion", "retro", "impact", "classic",
            ],
        )
        self.assertEqual(sum(len(item["palettes"]) for item in STYLES.values()), 24)
        palettes = {p for item in STYLES.values() for p in item["palettes"]}
        self.assertTrue(palettes.issubset(THEMES))
        self.assertEqual(len(THEMES), 30)

    def test_example_is_explicitly_mock_content(self):
        example = json.loads((KIT / "example" / "mock_carousel.json").read_text(encoding="utf-8"))

        self.assertEqual(example["content_origin"], "FIXED_MOCK_CONTENT")
        self.assertIn("вымышлен", example["notice"].lower())
        self.assertGreaterEqual(len(example["slides"]), 2)

    def test_offline_check_renders_real_png_with_original_renderer(self):
        with tempfile.TemporaryDirectory() as directory:
            env = os.environ.copy()
            env.pop("TELEGRAM_TOKEN", None)
            env.pop("OPENAI_API_KEY", None)
            env.pop("QWEN_API_KEY", None)
            result = subprocess.run(
                [sys.executable, str(KIT / "study_check.py"), "--output", directory],
                cwd=KIT,
                env=env,
                capture_output=True,
                text=True,
                timeout=90,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            pngs = sorted(Path(directory).glob("*.png"))
            self.assertEqual(len(pngs), 4)

            from PIL import Image
            for png in pngs:
                self.assertGreater(png.stat().st_size, 10_000)
                with Image.open(png) as image:
                    self.assertEqual(image.format, "PNG")
                    self.assertEqual(image.size, (1080, 1350))

            self.assertIn("FIXED_MOCK_CONTENT", result.stdout)
            self.assertIn("Сетевые запросы: 0", result.stdout)

            before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in pngs}
            repeated = subprocess.run(
                [sys.executable, str(KIT / "study_check.py"), "--output", directory],
                cwd=KIT, capture_output=True, text=True, timeout=90,
            )
            self.assertNotEqual(repeated.returncode, 0)
            after = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in pngs}
            self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
