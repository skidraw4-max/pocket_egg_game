"""Scan character PNGs for right-side ear/head alpha asymmetry."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

CHAR = Path(__file__).resolve().parents[1] / "client" / "public" / "characters"
SKIP_PARTS = {"export", "cards", "sheets"}


def analyze(path: Path) -> dict | None:
    with Image.open(path) as im:
        rgba = im.convert("RGBA")
    w, h = rgba.size
    alpha = rgba.split()[3]
    px = alpha.load()
    bbox = alpha.getbbox()
    if not bbox:
        return None
    x0, y0, x1, y1 = bbox
    ear_y1 = y0 + int((y1 - y0) * 0.35)
    mid_x = (x0 + x1) // 2
    left = sum(1 for y in range(y0, ear_y1) for x in range(x0, mid_x) if px[x, y] > 40)
    right = sum(1 for y in range(y0, ear_y1) for x in range(mid_x, x1) if px[x, y] > 40)
    ratio = right / max(left, 1)
    left_reach = mid_x - x0
    right_reach = x1 - mid_x
    return {
        "w": w,
        "h": h,
        "bbox": bbox,
        "left": left,
        "right": right,
        "ratio": round(ratio, 3),
        "left_reach": left_reach,
        "right_reach": right_reach,
    }


def should_skip(path: Path) -> bool:
    return any(part in SKIP_PARTS for part in path.parts)


def main() -> None:
    import sys

    severe_only = "--severe" in sys.argv
    threshold = 0.75 if severe_only else 0.65
    live_only = "--live" in sys.argv

    issues: list[tuple[float, str, dict]] = []
    total = 0
    for p in sorted(CHAR.rglob("*.png")):
        if should_skip(p):
            continue
        rel = str(p.relative_to(CHAR))
        if live_only:
            if not rel.startswith("status"):
                if rel.count("\\") > 0 or rel.count("/") > 0:
                    if not rel.startswith("classic"):
                        continue
                elif rel in ("egg.png",):
                    pass
                elif "/" not in rel and "\\" not in rel:
                    pass  # root species png
                elif not rel.startswith("classic"):
                    continue
            if "status-illustrated" in rel:
                continue
        total += 1
        r = analyze(p)
        if not r:
            continue
        if r["ratio"] < threshold or (
            r["right_reach"] < r["left_reach"] * 0.75 and r["left"] > 50
        ):
            issues.append((r["ratio"], rel, r))

    issues.sort()
    print(f"Scanned {total} PNGs, flagged {len(issues)} (threshold={threshold})")
    for ratio, rel, r in issues:
        print(
            f"{ratio:5.3f} L={r['left']:4d} R={r['right']:4d} "
            f"reach L/R={r['left_reach']}/{r['right_reach']}  {rel}"
        )


if __name__ == "__main__":
    main()
