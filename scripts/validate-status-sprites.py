"""Replace status sprites with bad ear symmetry using procedural fallback."""
from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "client" / "public" / "characters"
STATUS = CHAR / "status"
THRESHOLD = 0.72

_gen_path = Path(__file__).resolve().parent / "generate-status-expressions.py"
_spec = importlib.util.spec_from_file_location("generate_status_expressions", _gen_path)
assert _spec and _spec.loader
_gen = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_gen)

CLASSIC = _gen.CLASSIC
MODERN = _gen.MODERN
STATS = _gen.STATS
STAGES = _gen.STAGES
TIERS = _gen.TIERS
apply_effect = _gen.apply_effect
load_base = _gen.load_base
save_png = _gen.save_png


def ear_ratio(path: Path) -> float | None:
    with Image.open(path) as im:
        rgba = im.convert("RGBA")
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
    return right / max(left, 1)


def parse_status_path(path: Path) -> tuple[str, str, str | None, str, str] | None:
    rel = path.relative_to(STATUS)
    parts = rel.parts
    if len(parts) == 4:
        skin, species, stage, filename = parts
        if stage not in STAGES:
            return None
    elif len(parts) == 3:
        skin, species, filename = parts
        stage = None
    else:
        return None
    name = filename.removesuffix(".png")
    if "_" not in name:
        return None
    stat, tier = name.rsplit("_", 1)
    if stat not in STATS or tier not in TIERS:
        return None
    return skin, species, stage, stat, tier


def procedural_fallback(
    skin: str,
    species: str,
    stage: str,
    stat: str,
    tier: str,
) -> Image.Image | None:
    src_dir = CLASSIC if skin == "classic" else MODERN
    src = src_dir / f"{species}.png"
    if not src.exists():
        return None
    base = load_base(src)
    return apply_effect(base, stat, tier)


def fix_bad_sprites(dry_run: bool = False, threshold: float = THRESHOLD) -> tuple[int, int]:
    checked = 0
    replaced = 0
    cache: dict[tuple[str, str], Image.Image | None] = {}

    for path in sorted(STATUS.rglob("*.png")):
        parsed = parse_status_path(path)
        if not parsed:
            continue
        skin, species, stage, stat, tier = parsed
        checked += 1
        ratio = ear_ratio(path)
        if ratio is None or ratio >= threshold:
            continue

        base_key = (skin, species)
        if base_key not in cache:
            src = (CLASSIC if skin == "classic" else MODERN) / f"{species}.png"
            cache[base_key] = load_base(src) if src.exists() else None
        base = cache[base_key]
        if base is None:
            continue

        fixed = apply_effect(base, stat, tier)
        new_ratio = ear_ratio_from_image(fixed)
        if new_ratio is not None and new_ratio <= ratio:
            # Last resort: use base character without expression overlay
            fixed = base.copy()
            new_ratio = ear_ratio_from_image(fixed)
        if new_ratio is not None and new_ratio <= ratio:
            continue
        if new_ratio is not None and new_ratio < threshold * 0.95:
            continue

        rel = path.relative_to(CHAR)
        print(f"REPLACE {rel}: ratio {ratio:.3f} -> {new_ratio:.3f}")
        if not dry_run:
            save_png(path, fixed)
        replaced += 1

    print(f"Checked {checked}, replaced {replaced} (threshold={threshold})")
    return checked, replaced


def ear_ratio_from_image(rgba: Image.Image) -> float | None:
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
    return right / max(left, 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--threshold", type=float, default=THRESHOLD)
    args = parser.parse_args()
    fix_bad_sprites(args.dry_run, args.threshold)


if __name__ == "__main__":
    main()
