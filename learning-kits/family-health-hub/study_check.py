"""Import a fictional PDF using the original healthtablo pipeline, with no network."""
import argparse
import json
import os
import socket
from pathlib import Path


def no_network(*args, **kwargs):
    raise RuntimeError("Network is disabled in the educational check")


def run(target):
    target = target.resolve()
    if target.exists():
        raise SystemExit(f"Output already exists: {target}. Choose a NEW folder; nothing was changed.")
    target.mkdir(parents=True)
    os.environ["HUB_DATA_DIR"] = str(target / "data")
    os.environ["HUB_INBOX_DIR"] = str(target / "inbox")
    os.environ["HUB_AUTH_FILE"] = str(target / "data" / "auth.json")
    socket.create_connection = no_network
    socket.socket.connect = no_network
    import fitz
    from hubcore import db, ingest
    db.init_db()
    sample = target / "inbox" / "study-lab.pdf"
    with fitz.open() as pdf:
        page = pdf.new_page()
        page.insert_text((36, 60), "EDUCATIONAL FICTION - NOT A MEDICAL DOCUMENT\n"
                         "2026-01-10\n"
                         "Glucose | 5.0 | mmol/L | 3.9 - 6.1\n"
                         "Hemoglobin | 140 | g/L | 120 - 160\n", fontsize=12)
        pdf.save(sample)
    result = ingest.ingest_path(sample, subject="me")
    if result.status != "ingested" or result.results_count != 2:
        raise RuntimeError(f"Original importer failed: {result.status}, {result.results_count} values")
    duplicate = ingest.ingest_path(sample, subject="me")
    if duplicate.status != "duplicate":
        raise RuntimeError("Repeated PDF was not recognised as a duplicate")
    with db.get_conn() as conn:
        rows = conn.execute("SELECT raw_name,value_num,unit FROM results ORDER BY id").fetchall()
        if [r["value_num"] for r in rows] != [5.0, 140.0]:
            raise RuntimeError("Numbers changed during import")
        count = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
        if count != 1:
            raise RuntimeError("Expected exactly one document")
    report = {"educational_fiction": True, "network": "disabled", "documents": count,
              "values": [dict(row) for row in rows], "duplicate": duplicate.status}
    (target / "check-result.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"PASS: 2 values preserved; duplicate blocked; no network. Output: {target}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent / "study-output")
    run(parser.parse_args().output)
