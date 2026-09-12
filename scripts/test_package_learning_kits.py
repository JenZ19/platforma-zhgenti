import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

SCRIPT = Path(__file__).with_name("package_learning_kits.py")


class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(SCRIPT.exists(), "Safe packager not implemented")
        spec = importlib.util.spec_from_file_location("packager", SCRIPT)
        self.packager = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.packager)

    def fixture(self, root):
        root.mkdir()
        names = ["START-HERE.md", "AGENTS.md", "PROVENANCE.md", "study_check.py"]
        for name in names:
            (root / name).write_text("# educational example\n", encoding="utf-8")
        (root / "package-files.json").write_text(json.dumps(names))
        return names

    def test_allowlist_excludes_accidental_private_files_and_has_hashes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / "sample"
            names = self.fixture(root)
            (root / ".env").write_text("PRIVATE=never include")
            output = Path(folder) / "sample.zip"
            self.packager.package(root, output)
            with zipfile.ZipFile(output) as archive:
                self.assertNotIn("sample/.env", archive.namelist())
                manifest = json.loads(archive.read("sample/KIT-MANIFEST.json"))
                self.assertEqual(set(manifest["files"]), set(names))
                self.assertTrue(all(len(v) == 64 for v in manifest["files"].values()))

    def test_rejects_unsafe_included_paths_secrets_and_symlinks(self):
        for kind in ["secret", "symlink", "traversal", "database"]:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as folder:
                root = Path(folder) / "sample"
                names = self.fixture(root)
                if kind == "secret":
                    (root / "study_check.py").write_text("TOKEN='123456789:" + "A" * 35 + "'")
                elif kind == "symlink":
                    (root / "extra.py").symlink_to(root / "study_check.py")
                    names.append("extra.py")
                elif kind == "traversal":
                    names.append("../outside.py")
                else:
                    (root / "health.db").write_text("private records")
                    names.append("health.db")
                (root / "package-files.json").write_text(json.dumps(names))
                output = Path(folder) / "bad.zip"
                with self.assertRaises(ValueError):
                    self.packager.package(root, output)
                self.assertFalse(output.exists())

    def test_allows_explicit_nested_env_example_but_not_env(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / "sample"
            names = self.fixture(root)
            (root / "source").mkdir()
            (root / "source/.env.example").write_text("BOT_TOKEN=\n")
            names.append("source/.env.example")
            (root / "package-files.json").write_text(json.dumps(names))
            self.packager.package(root, Path(folder) / "safe.zip")
            (root / "source/.env").write_text("BOT_TOKEN=private")
            names.append("source/.env")
            (root / "package-files.json").write_text(json.dumps(names))
            with self.assertRaises(ValueError):
                self.packager.package(root, Path(folder) / "unsafe.zip")


if __name__ == "__main__":
    unittest.main()
