"""
Remove baked-in backgrounds from character PNGs (solid black or checkerboard).
Uses edge flood-fill — does not eat into dark character features (horns, eyes).
"""
from __future__ import annotations

from collections import Counter, deque
from pathlib import Path

from PIL import Image

CHAR_DIR = Path(__file__).resolve().parent.parent / "client" / "public" / "characters"
CHECKER_TOLERANCE = 18
BLACK_THRESHOLD = 32


def color_dist(a: tuple[int, ...], b: tuple[int, ...]) -> float:
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def sample_edge_colors(img: Image.Image) -> list[tuple[int, int, int]]:
    w, h = img.size
    counts: Counter[tuple[int, int, int]] = Counter()
    step = max(1, min(w, h) // 50)
    for x in range(0, w, step):
        counts[img.getpixel((x, 0))[:3]] += 1
        counts[img.getpixel((x, h - 1))[:3]] += 1
    for y in range(0, h, step):
        counts[img.getpixel((0, y))[:3]] += 1
        counts[img.getpixel((w - 1, y))[:3]] += 1
    return [c for c, _ in counts.most_common(4)]


def corners_are_black(img: Image.Image) -> bool:
    w, h = img.size
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    for x, y in corners:
        r, g, b = img.getpixel((x, y))[:3]
        if max(r, g, b) > BLACK_THRESHOLD:
            return False
    return True


def is_checkerboard_color(r: int, g: int, b: int, tile_colors: list[tuple[int, int, int]]) -> bool:
    spread = max(r, g, b) - min(r, g, b)
    avg = (r + g + b) / 3
    if spread > 12 or avg < 215 or avg > 256:
        return False
    return any(color_dist((r, g, b), tc) <= CHECKER_TOLERANCE for tc in tile_colors)


def is_black_background_color(r: int, g: int, b: int) -> bool:
    return max(r, g, b) <= BLACK_THRESHOLD


def remove_checkerboard_edge_flood(img: Image.Image, tolerance: int = 6) -> tuple[Image.Image, int]:
    """Edge-only checkerboard flood fill with strict tolerance (preserves fur)."""
    src = img.convert('RGBA')
    if corners_are_black(src):
        return remove_image_background(src)
    tile_colors = sample_edge_colors(src.convert('RGB'))
    w, h = src.size
    pixels = src.load()

    def matches(r: int, g: int, b: int) -> bool:
        spread = max(r, g, b) - min(r, g, b)
        avg = (r + g + b) / 3
        if spread > 10 or avg < 210 or avg > 250:
            return False
        return any(color_dist((r, g, b), tc) <= tolerance for tc in tile_colors)

    visited = [[False] * w for _ in range(h)]
    queue: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if visited[y][x]:
            return
        r, g, b, _ = pixels[x, y]
        if matches(r, g, b):
            visited[y][x] = True
            queue.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    removed = 0
    while queue:
        x, y = queue.popleft()
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        removed += 1
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                nr, ng, nb, _ = pixels[nx, ny]
                if matches(nr, ng, nb):
                    visited[ny][nx] = True
                    queue.append((nx, ny))
    return src, removed


def defringe_checkerboard_border(
    img: Image.Image,
    tolerance: int = 10,
) -> Image.Image:
    """Remove leftover checkerboard pixels touching transparent areas."""
    src = img.convert('RGBA')
    tile_colors = sample_edge_colors(src.convert('RGB'))
    px = src.load()
    w, h = src.size

    def is_checker(r: int, g: int, b: int) -> bool:
        return any(color_dist((r, g, b), tc) <= tolerance for tc in tile_colors)

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            touches_clear = False
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                    touches_clear = True
                    break
            if touches_clear and is_checker(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    return src


def defringe_and_pad(im: Image.Image, pad: int = 14, preserve_edges: bool = False) -> Image.Image:
    """Remove dark semi-transparent halos and add transparent margin."""
    rgba = im.convert('RGBA')
    if not preserve_edges:
        px = rgba.load()
        w, h = rgba.size
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                # Only strip obvious black fringe — keep soft fur/ear edge pixels
                if a < 100 and max(r, g, b) <= 18:
                    px[x, y] = (0, 0, 0, 0)
    w, h = rgba.size
    canvas = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    canvas.paste(rgba, (pad, pad), rgba)
    return canvas


def remove_image_background(img: Image.Image) -> tuple[Image.Image, str, int]:
    src = img.convert("RGBA")
    w, h = src.size
    pixels = src.load()
    use_black = corners_are_black(src)
    tile_colors = sample_edge_colors(src.convert("RGB")) if not use_black else []

    def matches(r: int, g: int, b: int) -> bool:
        if use_black:
            return is_black_background_color(r, g, b)
        return is_checkerboard_color(r, g, b, tile_colors)

    visited = [[False] * w for _ in range(h)]
    queue: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if visited[y][x]:
            return
        r, g, b, _ = pixels[x, y]
        if matches(r, g, b):
            visited[y][x] = True
            queue.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    removed = 0
    while queue:
        x, y = queue.popleft()
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        removed += 1
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                nr, ng, nb, _ = pixels[nx, ny]
                if matches(nr, ng, nb):
                    visited[ny][nx] = True
                    queue.append((nx, ny))

    mode = "black" if use_black else "checker"
    return src, mode, removed


def remove_background(path: Path) -> dict:
    with Image.open(path) as im:
        src, mode, removed = remove_image_background(im)
    src.save(path, "PNG", optimize=True)

    w, h = src.size
    px = src.load()
    opaque = sum(1 for y in range(h) for x in range(w) if px[x, y][3] > 128)
    corners_transparent = all(px[x, y][3] == 0 for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])

    return {
        "file": str(path.relative_to(CHAR_DIR.parent.parent.parent)) if path.is_relative_to(CHAR_DIR.parent.parent.parent) else path.name,
        "mode": mode,
        "removed": removed,
        "opaque_pct": round(opaque / (w * h) * 100, 1),
        "corners_ok": corners_transparent,
    }


def iter_character_pngs() -> list[Path]:
    paths: list[Path] = []
    for pattern in ("*.png", "classic/*.png", "status/**/*.png"):
        paths.extend(sorted(CHAR_DIR.glob(pattern)))
    return paths


def main() -> None:
    for png in iter_character_pngs():
        info = remove_background(png)
        status = "OK" if info["corners_ok"] and info["opaque_pct"] > 5 else "WARN"
        print(f"{status} [{info['mode']}] {info['file']}: opaque={info['opaque_pct']}% removed={info['removed']:,}")


if __name__ == "__main__":
    main()
