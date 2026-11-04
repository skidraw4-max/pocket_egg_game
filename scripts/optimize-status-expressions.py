"""Resize & compress status expression PNGs (in-place)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'client' / 'public' / 'characters' / 'status'
OUTPUT_MAX = 384


def resize_png(path: Path) -> tuple[int, int]:
    before = path.stat().st_size
    with Image.open(path) as im:
        im = im.convert('RGBA')
        w, h = im.size
        longest = max(w, h)
        if longest > OUTPUT_MAX:
            scale = OUTPUT_MAX / longest
            im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        im.save(path, format='PNG', optimize=True, compress_level=9)
    after = path.stat().st_size
    return before, after


def main() -> None:
    files = sorted(ROOT.rglob('*.png'))
    if not files:
        print('No status PNGs found under', ROOT)
        return

    total_before = 0
    total_after = 0
    for path in files:
        before, after = resize_png(path)
        total_before += before
        total_after += after

    print(f'Optimized {len(files)} files')
    print(f'Before: {total_before / 1024 / 1024:.1f} MB')
    print(f'After:  {total_after / 1024 / 1024:.1f} MB')
    print(f'Saved:  {(total_before - total_after) / 1024 / 1024:.1f} MB')


if __name__ == '__main__':
    main()
