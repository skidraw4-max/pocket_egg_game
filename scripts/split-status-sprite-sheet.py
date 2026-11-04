"""
Split AI-generated status sprite sheets into individual PNGs.

AI sheets are NOT equal grids (labels, gaps). Primary: connected-component blob
detection (12 blobs). Fallback: inset grid on background-removed sheet.
"""
from __future__ import annotations

import argparse
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from fix_character_transparency import (
    defringe_and_pad,
    defringe_checkerboard_border,
    remove_image_background,
)

ROOT = Path(__file__).resolve().parents[1]
SHEETS_DIR = ROOT / 'client' / 'public' / 'characters' / 'status-illustrated' / 'sheets'
OUT_ROOT = ROOT / 'client' / 'public' / 'characters' / 'status-illustrated' / 'modern'

STATS = ('clean', 'fatigue', 'hunger', 'mood')
TIERS = ('60', '30', '10')
STAGES = ('baby', 'child', 'teen', 'adult', 'mythic')
OUTPUT_MAX = 384
INSET_GRID_SPECIES = frozenset({
    'greenmon', 'forestmon', 'moonlightmon', 'crystalmon',
    'legendmon', 'infernomon', 'oraclemon', 'seraphimon',
})

BLOB_ALPHA = 40
CELL_PAD = 18
BLOB_MIN_AREAS = (5000, 3500, 2500, 1800)


SPECIES = [
    'basicmon', 'powermon', 'wizmon', 'lovelemon', 'greenmon', 'thundermon',
    'dragonmon', 'magicmon', 'angelmon', 'forestmon', 'moonlightmon', 'crystalmon',
    'legendmon', 'infernomon', 'oraclemon', 'seraphimon', 'gaiamon',
]


@dataclass
class Blob:
    minx: int
    miny: int
    maxx: int
    maxy: int
    area: int

    @property
    def cx(self) -> float:
        return (self.minx + self.maxx) / 2

    @property
    def cy(self) -> float:
        return (self.miny + self.maxy) / 2


def find_blobs(alpha: Image.Image, min_area: int = 5000) -> list[Blob]:
    w, h = alpha.size
    px = alpha.load()
    visited = [[False] * w for _ in range(h)]
    blobs: list[Blob] = []

    for y in range(h):
        for x in range(w):
            if visited[y][x] or px[x, y] < BLOB_ALPHA:
                continue
            queue: deque[tuple[int, int]] = deque([(x, y)])
            visited[y][x] = True
            minx = maxx = x
            miny = maxy = y
            area = 0
            while queue:
                cx, cy = queue.popleft()
                area += 1
                minx = min(minx, cx)
                maxx = max(maxx, cx)
                miny = min(miny, cy)
                maxy = max(maxy, cy)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and px[nx, ny] >= BLOB_ALPHA:
                        visited[ny][nx] = True
                        queue.append((nx, ny))
            if area >= min_area:
                blobs.append(Blob(minx, miny, maxx, maxy, area))

    return blobs


def sort_blobs_row_major(blobs: list[Blob], sheet_h: int) -> list[Blob]:
    row_h = sheet_h / 4
    return sorted(blobs, key=lambda b: (int(b.cy / row_h), b.cx))


def crop_blob(im: Image.Image, blob: Blob, pad: int = CELL_PAD) -> Image.Image:
    w, h = im.size
    x0 = max(0, blob.minx - pad)
    y0 = max(0, blob.miny - pad)
    x1 = min(w, blob.maxx + pad + 1)
    y1 = min(h, blob.maxy + pad + 1)
    return im.crop((x0, y0, x1, y1))


def trim_alpha_padded(im: Image.Image, pad: int = 8) -> Image.Image:
    rgba = im.convert('RGBA')
    bbox = rgba.split()[3].getbbox()
    if not bbox:
        return defringe_and_pad(rgba, pad=18, preserve_edges=True)
    x0, y0, x1, y1 = bbox
    w, h = rgba.size
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(w, x1 + pad)
    y1 = min(h, y1 + pad)
    return defringe_and_pad(rgba.crop((x0, y0, x1, y1)), pad=18, preserve_edges=True)


def resize_max(im: Image.Image) -> Image.Image:
    w, h = im.size
    longest = max(w, h)
    if longest <= OUTPUT_MAX:
        return im
    scale = OUTPUT_MAX / longest
    return im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)


def split_by_blobs(clean: Image.Image) -> list[Image.Image] | None:
    alpha = clean.split()[3]
    h = clean.size[1]
    for min_area in BLOB_MIN_AREAS:
        blobs = sort_blobs_row_major(find_blobs(alpha, min_area), h)
        if len(blobs) == 12:
            return [trim_alpha_padded(crop_blob(clean, b)) for b in blobs]
    return None


def split_sheet(species: str, sheet_path: Path) -> tuple[int, str]:
    if species in INSET_GRID_SPECIES:
        return 0, 'procedural-required'

    raw = Image.open(sheet_path).convert('RGBA')
    # Full-sheet mask for blob layout only
    layout, _, _ = remove_image_background(raw.copy())
    crops = split_by_blobs(layout)
    if crops is None:
        return 0, 'procedural-required'

    alpha = layout.split()[3]
    h = layout.size[1]
    blobs = sort_blobs_row_major(find_blobs(alpha), h)
    # Crop from layout (single bg removal pass) — re-removing on raw crops eats ear edges
    final_crops: list[Image.Image] = []
    for blob in blobs:
        piece = crop_blob(layout, blob, pad=CELL_PAD + 8)
        cleaned = defringe_checkerboard_border(piece, tolerance=8)
        final_crops.append(trim_alpha_padded(cleaned))

    baby_dir = OUT_ROOT / species / 'baby'
    baby_dir.mkdir(parents=True, exist_ok=True)

    idx = 0
    mode = 'blob'
    for stat in STATS:
        for tier in TIERS:
            cell = resize_max(final_crops[idx])
            out_path = baby_dir / f'{stat}_{tier}.png'
            cell.save(out_path, 'PNG', optimize=True, compress_level=9)
            idx += 1
    return idx, mode


def copy_to_stages(species: str) -> int:
    baby_dir = OUT_ROOT / species / 'baby'
    if not baby_dir.exists():
        return 0
    count = 0
    for stage in STAGES:
        if stage == 'baby':
            continue
        stage_dir = OUT_ROOT / species / stage
        stage_dir.mkdir(parents=True, exist_ok=True)
        for png in baby_dir.glob('*.png'):
            Image.open(png).convert('RGBA').save(stage_dir / png.name, 'PNG', optimize=True, compress_level=9)
            count += 1
    return count


def process_species(species: str) -> None:
    sheet = SHEETS_DIR / f'{species}.png'
    if not sheet.exists():
        print(f'SKIP {species}: no sheet')
        return
    n, mode = split_sheet(species, sheet)
    if mode == 'procedural-required':
        print(f'SKIP {species}: use procedural fallback (mode={mode})')
        return
    c = copy_to_stages(species)
    print(f'OK {species}: split={n} mode={mode} copied={c}')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--species')
    parser.add_argument('--sheet')
    parser.add_argument('--all-sheets', action='store_true')
    args = parser.parse_args()

    if args.sheet and args.species:
        n, mode = split_sheet(args.species, Path(args.sheet))
        copy_to_stages(args.species)
        print(f'OK {args.species}: split={n} mode={mode}')
        return

    if args.species:
        process_species(args.species)
        return

    if args.all_sheets:
        for sp in SPECIES:
            process_species(sp)
        return

    parser.print_help()


if __name__ == '__main__':
    main()
