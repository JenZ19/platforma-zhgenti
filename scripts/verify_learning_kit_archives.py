"""Verify source parity and extract four published kits to a new directory."""
import hashlib
import json
from pathlib import Path
import sys
import zipfile

from package_learning_kits import ROOT, SLUGS, VERSION

destination = Path(sys.argv[1]).resolve()
assert destination.is_dir() and not any(destination.iterdir()), "Use a new empty directory"
archives = ROOT / "public/materials/learning-kits"
public_manifest = json.loads((archives / "manifest.json").read_text())
for slug in SLUGS:
    source = ROOT / "learning-kits" / slug
    allowed = json.loads((source / "package-files.json").read_text())
    archive_path = archives / f"{slug}-{VERSION}.zip"
    assert hashlib.sha256(archive_path.read_bytes()).hexdigest() == public_manifest[slug]["sha256"]
    with zipfile.ZipFile(archive_path) as archive:
        assert archive.testzip() is None
        manifest = json.loads(archive.read(f"{slug}/KIT-MANIFEST.json"))
        assert manifest["slug"] == slug and manifest["version"] == VERSION
        assert set(manifest["files"]) == set(allowed)
        expected_names = {f"{slug}/{name}" for name in allowed} | {f"{slug}/KIT-MANIFEST.json"}
        assert set(archive.namelist()) == expected_names
        for name in allowed:
            assert not Path(name).is_absolute() and ".." not in Path(name).parts
            payload = archive.read(f"{slug}/{name}")
            assert hashlib.sha256(payload).hexdigest() == manifest["files"][name]
            assert payload == (source / name).read_bytes(), f"Stale archive: {slug}/{name}"
        archive.extractall(destination)
    print(f"PASS {slug}: {len(allowed)} files; source, ZIP and manifest hashes match")
