"""Generate per-species status expression PNGs — expression-only, stage-aware paths."""
from __future__ import annotations

import argparse
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance

from fix_character_transparency import defringe_and_pad, remove_image_background

ROOT = Path(__file__).resolve().parents[1] / 'client' / 'public' / 'characters'
MODERN = ROOT
CLASSIC = ROOT / 'classic'
OUT = ROOT / 'status'

SPECIES = [
    'basicmon', 'powermon', 'wizmon', 'lovelemon', 'greenmon', 'thundermon',
    'dragonmon', 'magicmon', 'angelmon', 'forestmon', 'moonlightmon', 'crystalmon',
    'legendmon', 'infernomon', 'oraclemon', 'seraphimon', 'gaiamon',
]
TOP5 = ['basicmon', 'powermon', 'wizmon', 'lovelemon', 'greenmon']
STATS = ('clean', 'fatigue', 'hunger', 'mood')
TIERS = ('60', '30', '10')
STAGES = ('baby', 'child', 'teen', 'adult', 'mythic')
OUTPUT_MAX = 384

PHASES: dict[str, dict] = {
    'p0': {'species': ['basicmon'], 'skins': ['modern'], 'stages': ['baby'], 'tiers': ['10', '30']},
    'p1': {'species': TOP5, 'skins': ['modern'], 'stages': ['baby'], 'tiers': ['10', '30']},
    'p2': {'species': SPECIES, 'skins': ['modern'], 'stages': ['baby'], 'tiers': list(TIERS)},
    # P3: child~mythic (classic 제외)
    'p3': {'species': SPECIES, 'skins': ['modern'], 'stages': ['child', 'teen', 'adult', 'mythic'], 'tiers': list(TIERS)},
    'modern-full': {'species': SPECIES, 'skins': ['modern'], 'stages': list(STAGES), 'tiers': list(TIERS)},
    'classic-full': {'species': SPECIES, 'skins': ['classic'], 'stages': list(STAGES), 'tiers': list(TIERS)},
}


def paste_center(base: Image.Image, overlay: Image.Image, cx: int, cy: int) -> None:
    x = cx - overlay.width // 2
    y = cy - overlay.height // 2
    base.paste(overlay, (x, y), overlay)


def character_bbox(base: Image.Image) -> tuple[int, int, int, int]:
    return base.split()[3].getbbox() or (0, 0, base.width, base.height)


def draw_dirt_on_body(draw: ImageDraw.ImageDraw, base: Image.Image, count: int, size: tuple[int, int]) -> None:
    x0, y0, x1, y1 = character_bbox(base)
    rng = random.Random(42)
    for _ in range(count):
        x = rng.randint(x0 + 8, max(x0 + 8, x1 - 8))
        y = rng.randint(y0 + int((y1 - y0) * 0.15), y1 - 8)
        sw, sh = size
        color = (rng.randint(90, 130), rng.randint(55, 85), rng.randint(25, 45), rng.randint(140, 220))
        draw.ellipse((x - sw, y - sh, x + sw, y + sh), fill=color)


def draw_eye_line(draw: ImageDraw.ImageDraw, cx: int, cy: int, w: int, openness: float) -> None:
    """openness: 1=wide, 0=closed"""
    half = int(w * 0.5)
    if openness <= 0.15:
        draw.line((cx - half, cy, cx + half, cy), fill=(60, 40, 80, 220), width=3)
    else:
        draw.arc((cx - half, cy - half, cx + half, cy + half), 200, 340, fill=(60, 40, 80, 200), width=3)


def draw_sad_eye(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    draw.arc((cx - r, cy - r, cx + r, cy + r), 20, 160, fill=(80, 60, 100, 200), width=3)


def draw_dizzy_eye(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(80, 60, 140, 220), width=2)
    draw.line((cx - r // 2, cy, cx + r // 2, cy), fill=(80, 60, 140, 200), width=2)
    draw.line((cx, cy - r // 2, cx, cy + r // 2), fill=(80, 60, 140, 200), width=2)


def tilt_canvas(img: Image.Image, overlay: Image.Image, degrees: float, shift_y: int = 0) -> tuple[Image.Image, Image.Image]:
    w, h = img.size
    rotated = img.rotate(degrees, expand=True, resample=Image.Resampling.BICUBIC)
    rot_overlay = overlay.rotate(degrees, expand=True, resample=Image.Resampling.BICUBIC)
    # Expanded canvas — original size crops tilted ears (especially on the right)
    nw = max(w, rotated.width)
    nh = max(h, rotated.height)
    canvas = Image.new('RGBA', (nw, nh), (0, 0, 0, 0))
    ocanvas = Image.new('RGBA', (nw, nh), (0, 0, 0, 0))
    ox = (nw - rotated.width) // 2
    oy = (nh - rotated.height) // 2 + shift_y
    canvas.paste(rotated, (ox, oy), rotated)
    ocanvas.paste(rot_overlay, (ox, oy), rot_overlay)
    return canvas, ocanvas


def apply_effect(base: Image.Image, stat: str, tier: str) -> Image.Image:
    img = base.convert('RGBA').copy()
    w, h = img.size
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    severity = {'60': 1, '30': 2, '10': 3}[tier]
    lx, rx = int(w * 0.38), int(w * 0.62)
    ey = int(h * 0.34)

    if stat == 'fatigue':
        if severity >= 1:
            draw_eye_line(draw, lx, ey, int(w * 0.12), 0.5)
            draw_eye_line(draw, rx, ey, int(w * 0.12), 0.5)
        if severity >= 2:
            draw_eye_line(draw, lx, ey, int(w * 0.14), 0.0)
            draw_eye_line(draw, rx, ey, int(w * 0.14), 0.0)
            img, overlay = tilt_canvas(img, overlay, -2, shift_y=int(h * 0.02))
            draw = ImageDraw.Draw(overlay)
        if severity >= 3:
            draw_eye_line(draw, lx, ey, int(w * 0.14), 0.0)
            draw_eye_line(draw, rx, ey, int(w * 0.14), 0.0)
            paste_center(overlay, _circle((255, 180, 200, 120), 10), int(w * 0.32), int(h * 0.42))
            paste_center(overlay, _circle((255, 180, 200, 120), 10), int(w * 0.68), int(h * 0.42))
            img, overlay = tilt_canvas(img, overlay, -5, shift_y=int(h * 0.04))
            w, h = img.size

    elif stat == 'hunger':
        if severity >= 1:
            paste_center(overlay, _circle((100, 180, 255, 200), 8), int(w * 0.54), int(h * 0.48))
        if severity >= 2:
            paste_center(overlay, _circle((255, 255, 255, 220), 6), int(w * 0.36), int(h * 0.32))
            paste_center(overlay, _circle((255, 255, 255, 220), 6), int(w * 0.60), int(h * 0.32))
            paste_center(overlay, _circle((100, 180, 255, 220), 12), int(w * 0.54), int(h * 0.50))
            img = ImageEnhance.Color(img).enhance(0.94)
        if severity >= 3:
            draw_dizzy_eye(draw, lx, ey, 14)
            draw_dizzy_eye(draw, rx, ey, 14)
            img = ImageEnhance.Color(img).enhance(0.88)
            img = ImageEnhance.Brightness(img).enhance(0.97)

    elif stat == 'mood':
        if severity >= 1:
            draw.line((int(w * 0.44), int(h * 0.48), int(w * 0.56), int(h * 0.48)), fill=(100, 80, 120, 200), width=3)
        if severity >= 2:
            paste_center(overlay, _circle((200, 210, 230, 160), 8), int(w * 0.72), int(h * 0.42))
            img, overlay = tilt_canvas(img, overlay, -8, shift_y=int(h * 0.03))
            draw = ImageDraw.Draw(overlay)
        if severity >= 3:
            draw_sad_eye(draw, lx, ey, 12)
            draw_sad_eye(draw, rx, ey, 12)
            img, overlay = tilt_canvas(img, overlay, -8, shift_y=int(h * 0.06))

    elif stat == 'clean':
        dirt_count = {1: 6, 2: 14, 3: 24}[severity]
        dirt_size = {1: (10, 7), 2: (14, 10), 3: (18, 12)}[severity]
        draw_dirt_on_body(draw, img, dirt_count, dirt_size)
        if severity >= 3:
            draw.line((int(w * 0.35), int(h * 0.52), int(w * 0.65), int(h * 0.54)), fill=(80, 50, 30, 160), width=3)

    return Image.alpha_composite(img, overlay)


def _circle(color: tuple[int, int, int, int], r: int) -> Image.Image:
    size = r * 2
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse((0, 0, size - 1, size - 1), fill=color)
    return im


def save_png(path: Path, image: Image.Image) -> None:
    im = defringe_and_pad(image.convert('RGBA'), pad=10, preserve_edges=True)
    w, h = im.size
    longest = max(w, h)
    if longest > OUTPUT_MAX:
        scale = OUTPUT_MAX / longest
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format='PNG', optimize=True, compress_level=9)


def load_base(src: Path) -> Image.Image:
    base = Image.open(src).convert('RGBA')
    base, _, _ = remove_image_background(base)
    bw, bh = base.size
    if max(bw, bh) > OUTPUT_MAX:
        scale = OUTPUT_MAX / max(bw, bh)
        base = base.resize((int(bw * scale), int(bh * scale)), Image.Resampling.LANCZOS)
    return base


def generate_for_skin(
    skin: str,
    src_dir: Path,
    species_list: list[str],
    stages: list[str],
    tiers: list[str],
) -> int:
    count = 0
    for file_id in species_list:
        src = src_dir / f'{file_id}.png'
        if not src.exists():
            print('MISSING', skin, file_id)
            continue
        base = load_base(src)
        for stage in stages:
            for stat in STATS:
                for tier in tiers:
                    out_path = OUT / skin / file_id / stage / f'{stat}_{tier}.png'
                    result = apply_effect(base, stat, tier)
                    save_png(out_path, result)
                    count += 1
    return count


def run_phase(phase: str, species_filter: list[str] | None = None) -> int:
    cfg = PHASES[phase]
    species_list = species_filter if species_filter else cfg['species']
    total = 0
    for skin in cfg['skins']:
        src_dir = CLASSIC if skin == 'classic' else MODERN
        total += generate_for_skin(skin, src_dir, species_list, cfg['stages'], cfg['tiers'])
    print(f'[{phase}] Generated {total} images under {OUT} (species={len(species_list)})')
    return total


def main() -> None:
    parser = argparse.ArgumentParser(description='Generate status expression sprites')
    parser.add_argument(
        '--phase',
        choices=['p0', 'p1', 'p2', 'p3', 'modern-full', 'classic-full'],
        default='modern-full',
        help='p0=basicmon, p1=TOP5, p2=baby all, p3=child~mythic, modern-full=all modern stages',
    )
    parser.add_argument('--species', nargs='*', help='Limit to specific species ids')
    args = parser.parse_args()
    run_phase(args.phase, args.species or None)


if __name__ == '__main__':
    main()
