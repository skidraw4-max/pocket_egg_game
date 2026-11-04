"""Run transparency fix on classic character PNGs."""
from pathlib import Path

from fix_character_transparency import remove_background

CLASSIC_DIR = Path(__file__).resolve().parent.parent / "client" / "public" / "characters" / "classic"


def main() -> None:
    for png in sorted(CLASSIC_DIR.glob("*.png")):
        info = remove_background(png)
        status = "OK" if info["corners_ok"] and info["opaque_pct"] > 15 else "WARN"
        print(f"{status} {info['file']}: opaque={info['opaque_pct']}% removed={info['removed']:,}")


if __name__ == "__main__":
    main()
