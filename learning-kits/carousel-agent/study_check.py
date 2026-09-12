#!/usr/bin/env python3
"""Offline check: render fixed mock slides through the original renderer."""

import argparse
import json
import shutil
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parent
sys.path.insert(0, str(KIT / "source"))

from carousel_generator import CarouselGenerator  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=KIT / "study-output")
    output = parser.parse_args().output
    targets = [output / f"slide-{number:02d}.png" for number in range(1, 5)]
    existing = [path for path in targets if path.exists()]
    if existing:
        names = ", ".join(path.name for path in existing)
        raise SystemExit(f"Выходные PNG уже существуют, ничего не перезаписано: {names}")
    output.mkdir(parents=True, exist_ok=True)
    example = json.loads((KIT / "example" / "mock_carousel.json").read_text(encoding="utf-8"))
    renderer = CarouselGenerator()
    rendered = []
    for slide in example["slides"]:
        temporary = Path(renderer.generate_slide(slide, example["theme"], example["username"]))
        destination = output / f"slide-{slide['slide_number']:02d}.png"
        shutil.move(temporary, destination)
        rendered.append(destination)
    cta = example["cta"]
    total = len(example["slides"]) + 1
    temporary = Path(renderer.generate_cta_slide(
        cta["text"], example["theme"], example["username"], total, total,
        subtext=cta["subtext"],
    ))
    destination = output / f"slide-{total:02d}.png"
    shutil.move(temporary, destination)
    rendered.append(destination)
    print("Контент: FIXED_MOCK_CONTENT — вымышленный, не результат ИИ")
    print("Сетевые запросы: 0")
    print(f"PNG исходным рендерером: {len(rendered)}")
    for path in rendered:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
