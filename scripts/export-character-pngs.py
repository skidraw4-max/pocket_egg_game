"""Export Pocket Egg character PNGs with Korean filenames + roster sheet."""
from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / 'client' / 'public' / 'characters'
EXPORT = ROOT / 'export'
MODERN = ROOT
CLASSIC = ROOT / 'classic'

SPECIES: list[tuple[str, str, str]] = [
    ('basicmon', '기본몬', 'normal'),
    ('powermon', '파워몬', 'uncommon'),
    ('wizmon', '위즈몬', 'uncommon'),
    ('lovelemon', '러블리몬', 'uncommon'),
    ('greenmon', '그린몬', 'uncommon'),
    ('thundermon', '번개몬', 'uncommon'),
    ('dragonmon', '드래곤몬', 'rare'),
    ('magicmon', '매직몬', 'rare'),
    ('angelmon', '엔젤몬', 'rare'),
    ('forestmon', '포레스몬', 'rare'),
    ('moonlightmon', '문라이트몬', 'rare'),
    ('crystalmon', '크리스탈몬', 'rare'),
    ('legendmon', '레전드몬', 'epic'),
    ('infernomon', '인페르노몬', 'legend'),
    ('oraclemon', '오라클몬', 'legend'),
    ('seraphimon', '세라피몬', 'legend'),
    ('gaiamon', '가이아몬', 'legend'),
]


def main() -> None:
    for sub in ('modern', 'classic'):
        (EXPORT / sub).mkdir(parents=True, exist_ok=True)

    manifest: dict = {'modern': [], 'classic': [], 'egg': {}}

    egg_modern = MODERN / 'egg.png'
    egg_classic = CLASSIC / 'egg.png'
    if not egg_modern.exists() and egg_classic.exists():
        shutil.copy2(egg_classic, egg_modern)

    for skin, src_dir in ('modern', MODERN), ('classic', CLASSIC):
        for file_id, korean, grade in SPECIES:
            src = src_dir / f'{file_id}.png'
            if not src.exists():
                print('MISSING', skin, file_id)
                continue
            dst_name = f'{file_id}_{korean}.png'
            shutil.copy2(src, EXPORT / skin / dst_name)
            rel = f'characters/{file_id}.png' if skin == 'modern' else f'characters/classic/{file_id}.png'
            manifest[skin].append({
                'id': file_id,
                'name': korean,
                'grade': grade,
                'file': dst_name,
                'source': rel,
            })

        egg = src_dir / 'egg.png'
        if egg.exists():
            shutil.copy2(egg, EXPORT / skin / 'egg_알.png')
            manifest['egg'][skin] = 'egg_알.png'

    thumb_h = 256
    cols = 6
    items: list[tuple[Path, str]] = []
    for file_id, korean, _ in SPECIES:
        p = MODERN / f'{file_id}.png'
        if p.exists():
            items.append((p, korean))

    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * thumb_h, rows * (thumb_h + 40)), (255, 255, 255, 0))
    try:
        font = ImageFont.truetype('malgun.ttf', 22)
    except OSError:
        font = ImageFont.load_default()
    draw = ImageDraw.Draw(sheet)

    for i, (path, label) in enumerate(items):
        im = Image.open(path).convert('RGBA')
        ratio = thumb_h / im.height
        tw = int(im.width * ratio)
        im = im.resize((tw, thumb_h), Image.Resampling.LANCZOS)
        col, row = i % cols, i // cols
        x = col * thumb_h + (thumb_h - tw) // 2
        y = row * (thumb_h + 40)
        sheet.paste(im, (x, y), im)
        draw.text((col * thumb_h + 8, y + thumb_h + 6), label, fill=(60, 40, 90, 255), font=font)

    sheet_path = EXPORT / 'all-characters-roster-modern.png'
    sheet.save(sheet_path)

    (EXPORT / 'manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )

    print(f'exported modern: {len(manifest["modern"])}')
    print(f'exported classic: {len(manifest["classic"])}')
    print(f'sheet: {sheet_path}')
    print(f'egg modern: {egg_modern.exists()}')


if __name__ == '__main__':
    main()
