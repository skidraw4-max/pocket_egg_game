"""Sync legacy flat status PNGs from baby stage (used as URL fallback)."""
from __future__ import annotations

import shutil
from pathlib import Path

STATUS = Path(__file__).resolve().parents[1] / "client" / "public" / "characters" / "status"


def main() -> None:
    count = 0
    for skin_dir in STATUS.iterdir():
        if not skin_dir.is_dir():
            continue
        for species_dir in skin_dir.iterdir():
            if not species_dir.is_dir():
                continue
            baby = species_dir / "baby"
            if not baby.is_dir():
                continue
            for png in baby.glob("*.png"):
                dest = species_dir / png.name
                shutil.copy2(png, dest)
                count += 1
    print(f"Synced {count} flat fallback sprites from baby stage")


if __name__ == "__main__":
    main()
