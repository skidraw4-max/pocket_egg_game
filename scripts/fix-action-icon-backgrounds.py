#!/usr/bin/env python3
"""특수 액션 아이콘 PNG — 밝은 사각 배경 제거 후 투명 PNG로 저장."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'client' / 'public' / 'images' / 'actions'
OUTPUT_SIZE = 256


def remove_light_background(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size

    # 모서리·가장자리 샘플로 배경색 추정
    samples = []
    for x in range(w):
        samples.append(px[x, 0])
        samples.append(px[x, h - 1])
    for y in range(h):
        samples.append(px[0, y])
        samples.append(px[w - 1, y])
    opaque = [s for s in samples if s[3] > 128]
    if opaque:
        bg_r = sum(s[0] for s in opaque) // len(opaque)
        bg_g = sum(s[1] for s in opaque) // len(opaque)
        bg_b = sum(s[2] for s in opaque) // len(opaque)
    else:
        bg_r = bg_g = bg_b = 245

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            dist = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5
            lum = (r + g + b) / 3
            spread = max(r, g, b) - min(r, g, b)
            if dist <= 36 or (lum >= 220 and spread <= 28):
                px[x, y] = (r, g, b, 0)
            elif dist <= 58 or (lum >= 200 and spread <= 32):
                fade = int(max(0, min(255, (58 - dist) / 22 * 255)))
                px[x, y] = (r, g, b, min(a, fade))

    bbox = im.getbbox()
    if not bbox:
        return im
    pad = max(4, int(min(w, h) * 0.02))
    x0 = max(0, bbox[0] - pad)
    y0 = max(0, bbox[1] - pad)
    x1 = min(w, bbox[2] + pad)
    y1 = min(h, bbox[3] + pad)
    cropped = im.crop((x0, y0, x1, y1))
    cw, ch = cropped.size
    scale = OUTPUT_SIZE / max(cw, ch)
    nw, nh = int(cw * scale), int(ch * scale)
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new('RGBA', (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
    out.paste(resized, ((OUTPUT_SIZE - nw) // 2, (OUTPUT_SIZE - nh) // 2), resized)
    return out


def main() -> None:
    for path in sorted(ROOT.glob('action-*.png')):
        before = path.stat().st_size
        fixed = remove_light_background(Image.open(path))
        fixed.save(path, format='PNG', optimize=True)
        corner = fixed.load()[0, 0]
        print(f'{path.name}: {before // 1024}KB -> {path.stat().st_size // 1024}KB, corner={corner}')


if __name__ == '__main__':
    main()
