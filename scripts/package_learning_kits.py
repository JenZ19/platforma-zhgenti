"""Package explicitly reviewed educational sources, never entire working folders."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SLUGS = ("carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub")
VERSION = "2026-09-08.1"
REQUIRED = {"START-HERE.md", "AGENTS.md", "PROVENANCE.md", "study_check.py"}
SUFFIXES = {".py", ".txt", ".md", ".json", ".yaml", ".yml", ".toml", ".html", ".css", ".js", ".svg", ".png", ".ttf", ".otf", ".woff2", ".webmanifest"}
SECRET = re.compile(rb"(?:\b\d{8,12}:[A-Za-z0-9_-]{30,}\b|\bsk-(?:proj-|or-v1-)?[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----)")
PRIVATE_PARTS = {"data", "inbox", "logs", "sessions", "__pycache__", ".git", ".venv", "venv", "deploy", "study-output"}


def package(source: Path, output: Path):
    source = source.resolve()
    names = json.loads((source / "package-files.json").read_text(encoding="utf-8"))
    if not isinstance(names, list) or not all(isinstance(n, str) for n in names):
        raise ValueError("Expected explicit file list")
    if len(names) != len(set(names)) or not REQUIRED.issubset(names):
        raise ValueError("Missing required instruction or duplicate file")
    contents = {}
    for name in sorted(names):
        rel = PurePosixPath(name)
        if rel.is_absolute() or ".." in rel.parts or "\\" in name or any(p in PRIVATE_PARTS for p in rel.parts):
            raise ValueError(f"Unsafe path: {name}")
        if any(p.startswith(".") for p in rel.parts[:-1]) or (rel.name.startswith(".") and rel.name not in {".env.example", ".gitignore"}):
            raise ValueError(f"Unsafe hidden file: {name}")
        if rel.suffix not in SUFFIXES and rel.name not in {"LICENSE", ".env.example", ".gitignore"}:
            raise ValueError(f"Unreviewed file type: {name}")
        file = source / name
        if not file.is_file() or any(p.is_symlink() for p in [file, *file.parents] if p != source.parent):
            raise ValueError(f"Missing file or symlink: {name}")
        data = file.read_bytes()
        if SECRET.search(data):
            raise ValueError(f"Possible secret in {name}; contents not printed")
        contents[name] = data
    manifest = {"slug": source.name, "version": VERSION,
                "files": {n: hashlib.sha256(data).hexdigest() for n, data in contents.items()}}
    # Validate everything before creating an archive or touching an existing output.
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in contents.items():
            archive.writestr(f"{source.name}/{name}", data)
        archive.writestr(f"{source.name}/KIT-MANIFEST.json", json.dumps(manifest, ensure_ascii=False, indent=2))
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise ValueError(f"Invalid archive: {output.name}")
    return {"version": VERSION, "bytes": output.stat().st_size,
            "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "files": len(contents)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slug", choices=SLUGS)
    parser.add_argument("--output", type=Path, default=ROOT / "public/materials/learning-kits")
    args = parser.parse_args()
    results = {}
    for slug in ([args.slug] if args.slug else SLUGS):
        results[slug] = package(ROOT / "learning-kits" / slug, args.output / f"{slug}-{VERSION}.zip")
    (args.output / "manifest.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))
