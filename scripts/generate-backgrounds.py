#!/usr/bin/env python3
"""타이틀·기본 방·알 선택 배경 생성/복원 (1080x1920 webp)."""
from __future__ import annotations

import io
import math
import sys
from pathlib import Path

try:
    import requests
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    print("pip install requests pillow 필요")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
OUT_IMAGES = ROOT / "client" / "public" / "images"
OUT_WALL = ROOT / "client" / "public" / "wallpapers"
TARGET = (1080, 1920)
QUALITY = 84

TITLE_MIRROR = (
    "https://pocket-egg.web.app/legacy-cdn/session_file/310519663342761074/"
    "YSlzPwLAfBZIZzDk.png"
)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_color(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        c = lerp_color(top, bottom, y / max(h - 1, 1))
        for x in range(w):
            px[x, y] = c
    return img


def add_radial_glow(base: Image.Image, center: tuple[int, int], radius: int, color: tuple[int, int, int, int]) -> Image.Image:
    w, h = base.size
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    cx, cy = center
    for r in range(radius, 0, -8):
        alpha = int(color[3] * (r / radius) ** 2)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(color[0], color[1], color[2], alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(18))
    return Image.alpha_composite(base.convert("RGBA"), glow)


def restore_title_bg() -> Path:
    out = OUT_IMAGES / "title-bg.webp"
    OUT_IMAGES.mkdir(parents=True, exist_ok=True)
    print("Downloading title background from Firebase mirror...")
    resp = requests.get(TITLE_MIRROR, timeout=60)
    resp.raise_for_status()
    img = Image.open(io.BytesIO(resp.content)).convert("RGBA")
    if img.size != TARGET:
        img = img.resize(TARGET, Image.Resampling.LANCZOS)
    rgb = Image.new("RGB", TARGET, (255, 255, 255))
    rgb.paste(img, mask=img.split()[3])
    rgb.save(out, "WEBP", quality=QUALITY, method=6)
    print(f"  -> {out} ({out.stat().st_size // 1024} KB)")
    return out


def draw_nursery_room() -> Image.Image:
    """Cozy Nursery 기본 방 — 따뜻한 아기방 + 창문 + 나무 바닥."""
    w, h = TARGET
    img = vertical_gradient(TARGET, (255, 244, 250), (237, 220, 245)).convert("RGBA")
    draw = ImageDraw.Draw(img)

    floor_y = int(h * 0.62)
    # 바닥 영역
    floor = vertical_gradient((w, h - floor_y), (210, 170, 130), (170, 120, 85))
    img.paste(floor, (0, floor_y))

    # 바닥 판자
    draw = ImageDraw.Draw(img)
    for i in range(0, w, 48):
        shade = 150 + (i % 96) // 6
        draw.line([(i, floor_y), (i - 80, h)], fill=(shade, shade - 30, shade - 60), width=2)

    # 벽지 하단 몰딩
    draw.rectangle((0, floor_y - 18, w, floor_y + 4), fill=(255, 255, 255, 180))
    draw.rectangle((0, floor_y - 10, w, floor_y - 6), fill=(240, 200, 220))

    # 창문 (아치형)
    win_cx, win_top, win_w, win_h = w // 2, int(h * 0.12), 420, 520
    win_l, win_r = win_cx - win_w // 2, win_cx + win_w // 2
    win_b = win_top + win_h
    sky = vertical_gradient((win_w, win_h), (186, 230, 255), (255, 248, 230))
    sdraw = ImageDraw.Draw(sky)
    for cx, cy, rr in [(90, 120, 38), (280, 90, 52), (330, 200, 28)]:
        sdraw.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=(255, 255, 255, 230))
    sdraw.ellipse((win_w // 2 - 18, win_h - 70, win_w // 2 + 18, win_h - 34), fill=(255, 220, 180))
    img.paste(sky, (win_l, win_top))

    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((win_l - 16, win_top - 8, win_r + 16, win_b + 12), radius=28, outline=(255, 255, 255), width=14)
    draw.line([(win_cx, win_top), (win_cx, win_b)], fill=(255, 255, 255), width=8)
    draw.line([(win_l, win_top + win_h // 2), (win_r, win_top + win_h // 2)], fill=(255, 255, 255), width=8)

    # 커튼
    for side, x0 in [("L", win_l - 36), ("R", win_r - 8)]:
        curtain = vertical_gradient((44, win_h + 40), (255, 182, 193), (255, 140, 170))
        img.paste(curtain, (x0 if side == "L" else x0, win_top - 20))

    # 왼쪽 책장
    shelf_x, shelf_y, shelf_w, shelf_h = 48, int(h * 0.28), 200, 420
    draw.rounded_rectangle((shelf_x, shelf_y, shelf_x + shelf_w, shelf_y + shelf_h), radius=16, fill=(255, 240, 245), outline=(240, 200, 215), width=4)
    for row in range(4):
        yy = shelf_y + 50 + row * 88
        draw.line([(shelf_x + 12, yy), (shelf_x + shelf_w - 12, yy)], fill=(230, 190, 205), width=4)
        colors = [(255, 160, 180), (180, 210, 255), (255, 220, 150), (190, 240, 200)]
        for col, bc in enumerate(colors):
            bx = shelf_x + 20 + col * 42
            draw.rounded_rectangle((bx, yy - 36, bx + 34, yy - 4), radius=4, fill=bc)

    # 오른쪽 화분
    pot_x = w - 180
    draw.ellipse((pot_x, int(h * 0.42), pot_x + 120, int(h * 0.42) + 140), fill=(120, 200, 130))
    draw.ellipse((pot_x + 10, int(h * 0.42) + 20, pot_x + 110, int(h * 0.42) + 120), fill=(90, 180, 110))
    draw.rounded_rectangle((pot_x + 30, int(h * 0.52), pot_x + 90, int(h * 0.58)), radius=8, fill=(210, 130, 90))

    # 중앙 라운드 러그
    rug_cy = int(h * 0.78)
    rug = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(rug)
    rdraw.ellipse((win_cx - 260, rug_cy - 90, win_cx + 260, rug_cy + 90), fill=(255, 210, 225, 210))
    rdraw.ellipse((win_cx - 220, rug_cy - 70, win_cx + 220, rug_cy + 70), fill=(255, 230, 240, 180))
    img = Image.alpha_composite(img, rug)

    # 벽 장식 — 작은 별·하트
    draw = ImageDraw.Draw(img)
    for sx, sy in [(180, 180), (900, 220), (820, 360), (140, 340)]:
        draw.text((sx, sy), "✦", fill=(255, 200, 220))
    draw.text((w // 2 - 20, win_b + 36), "♡", fill=(255, 180, 200))

    # 창문 빛
    img = add_radial_glow(img, (win_cx, win_top + win_h // 2), 520, (255, 255, 230, 90))

    # 상단 부드러운 비네팅
    vignette = vertical_gradient(TARGET, (200, 160, 220), (255, 255, 255))
    vignette = vignette.convert("L").point(lambda p: int(p * 0.12))
    img_rgb = Image.merge("RGB", img.split()[:3])
    img_rgb = Image.composite(img_rgb, Image.new("RGB", TARGET, (255, 244, 250)), vignette)
    return img_rgb


def draw_egg_select_bg() -> Image.Image:
    """알 선택 화면 — 보라빛 마법 밤하늘."""
    img = vertical_gradient(TARGET, (30, 27, 75), (76, 29, 149)).convert("RGBA")
    draw = ImageDraw.Draw(img)
    w, h = TARGET
    for i in range(80):
        x = (i * 137) % w
        y = (i * 89) % h
        r = 1 + (i % 3)
        alpha = 120 + (i % 5) * 25
        draw.ellipse((x, y, x + r * 2, y + r * 2), fill=(255, 255, 255, alpha))

    img = add_radial_glow(img, (w // 2, int(h * 0.35)), 480, (168, 85, 247, 70))
    img = add_radial_glow(img, (w // 2, int(h * 0.75)), 360, (236, 72, 153, 40))
    return Image.merge("RGB", img.split()[:3])


def save_webp(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if img.size != TARGET:
        img = img.resize(TARGET, Image.Resampling.LANCZOS)
    img.save(path, "WEBP", quality=QUALITY, method=6)
    print(f"  -> {path} ({path.stat().st_size // 1024} KB)")


def main() -> None:
    restore_title_bg()
    print("Generating default nursery wallpaper...")
    save_webp(draw_nursery_room(), OUT_WALL / "wallpaper_default.webp")
    print("Generating egg select background...")
    save_webp(draw_egg_select_bg(), OUT_IMAGES / "egg-select-bg.webp")
    print("Done.")


if __name__ == "__main__":
    main()
