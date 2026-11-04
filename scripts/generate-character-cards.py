"""Generate Pocket Egg TCG-style character cards (Pokemon-inspired layout)."""
from __future__ import annotations

import json
import math
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / 'client' / 'public' / 'characters'
OUT_DIR = CHAR_DIR / 'cards'

# Standard TCG ratio ~63×88 mm
CARD_W, CARD_H = 630, 880
OUTER = 16
INNER_R = 22

SPECIES = [
    ('basicmon', '기본몬', 'baby', 'normal', '🥚', '알에서 갓 태어난 순수한 반려몬'),
    ('powermon', '파워몬', 'child', 'uncommon', '💪', '힘이 넘치는 활발한 반려몬'),
    ('wizmon', '위즈몬', 'child', 'uncommon', '🧠', '호기심 가득한 똑똑한 반려몬'),
    ('lovelemon', '러블리몬', 'child', 'uncommon', '💖', '사랑스러운 매력의 반려몬'),
    ('greenmon', '그린몬', 'child', 'uncommon', '🌿', '자연을 사랑하는 건강한 반려몬'),
    ('thundermon', '번개몬', 'child', 'uncommon', '⚡', '번개 에너지가 몸을 감싼 반려몬'),
    ('dragonmon', '드래곤몬', 'teen', 'rare', '🐉', '강력한 힘을 가진 용 반려몬'),
    ('magicmon', '매직몬', 'teen', 'rare', '🔮', '마법을 부리는 신비한 반려몬'),
    ('angelmon', '엔젤몬', 'teen', 'rare', '👼', '천사처럼 아름다운 반려몬'),
    ('forestmon', '포레스몬', 'teen', 'rare', '🌳', '숲의 수호자 반려몬'),
    ('moonlightmon', '문라이트몬', 'teen', 'rare', '🌙', '달빛을 품은 고양이 반려몬'),
    ('crystalmon', '크리스탈몬', 'teen', 'rare', '💎', '수정 결정을 두른 지혜로운 반려몬'),
    ('legendmon', '레전드몬', 'adult', 'epic', '👑', '모든 속성을 초월한 전설의 반려몬'),
    ('infernomon', '인페르노몬', 'mythic', 'legend', '🔥', '화염을 지배하는 궁극의 드래곤'),
    ('oraclemon', '오라클몬', 'mythic', 'legend', '🔮', '우주의 진리를 꿰뚫는 전지전능한 반려몬'),
    ('seraphimon', '세라피몬', 'mythic', 'legend', '✨', '신성한 빛을 발하는 최고의 천사'),
    ('gaiamon', '가이아몬', 'mythic', 'legend', '🌍', '대지의 생명력을 담은 자연의 신'),
]

STAGE_KO = {
    'egg': '알',
    'baby': '아기',
    'child': '어린이',
    'teen': '청소년',
    'adult': '성체',
    'mythic': '전설',
}

# speciesRegistry-aligned grade palette + TCG frame tones
GRADE = {
    'normal': {
        'label': '노멀', 'badge': '기본', 'hp': 30,
        'frame_dark': '#6B7280', 'frame_mid': '#9CA3AF', 'frame_light': '#D1D5DB',
        'header': '#E5E7EB', 'panel': '#F9FAFB', 'accent': '#4B5563',
    },
    'uncommon': {
        'label': '언커먼', 'badge': '성장', 'hp': 50,
        'frame_dark': '#15803D', 'frame_mid': '#22C55E', 'frame_light': '#86EFAC',
        'header': '#DCFCE7', 'panel': '#F0FDF4', 'accent': '#166534',
    },
    'rare': {
        'label': '레어', 'badge': '희귀', 'hp': 70,
        'frame_dark': '#1D4ED8', 'frame_mid': '#3B82F6', 'frame_light': '#93C5FD',
        'header': '#DBEAFE', 'panel': '#EFF6FF', 'accent': '#1E40AF',
    },
    'epic': {
        'label': '에픽', 'badge': '영웅', 'hp': 90,
        'frame_dark': '#7E22CE', 'frame_mid': '#A855F7', 'frame_light': '#D8B4FE',
        'header': '#F3E8FF', 'panel': '#FAF5FF', 'accent': '#6B21A8',
    },
    'legend': {
        'label': '레전드', 'badge': '전설', 'hp': 120,
        'frame_dark': '#B45309', 'frame_mid': '#EAB308', 'frame_light': '#FDE68A',
        'header': '#FEF3C7', 'panel': '#FEFCE8', 'accent': '#92400E',
    },
}


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        'C:/Windows/Fonts/malgunbd.ttf' if bold else 'C:/Windows/Fonts/malgun.ttf',
        'C:/Windows/Fonts/malgun.ttf',
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip('#')
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def lerp_color(a: str, b: str, t: float) -> tuple[int, int, int]:
    ar, ag, ab = hex_rgb(a)
    br, bg, bb = hex_rgb(b)
    return (
        int(ar + (br - ar) * t),
        int(ag + (bg - ag) * t),
        int(ab + (bb - ab) * t),
    )


def fill_gradient_v(img: Image.Image, box: tuple[int, int, int, int], top: str, bottom: str):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    h = max(1, y1 - y0)
    for y in range(y0, y1):
        t = (y - y0) / h
        draw.line([(x0, y), (x1, y)], fill=lerp_color(top, bottom, t))


def fill_gradient_h(img: Image.Image, box: tuple[int, int, int, int], left: str, right: str):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    w = max(1, x1 - x0)
    for x in range(x0, x1):
        t = (x - x0) / w
        draw.line([(x, y0), (x, y1)], fill=lerp_color(left, right, t))


def draw_tcg_outer_frame(card: Image.Image, g: dict):
    """Pokemon-style thick beveled border tinted by grade."""
    draw = ImageDraw.Draw(card)
    w, h = card.size

    # drop shadow
    shadow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((8, 10, w, h), radius=INNER_R + 4, fill=(15, 10, 5, 70))
    card.alpha_composite(shadow)

    # outer dark rim
    draw.rounded_rectangle((0, 0, w - 8, h - 8), radius=INNER_R + 4, fill=g['frame_dark'])

    # main colored frame (gradient)
    frame_box = (4, 4, w - 12, h - 12)
    fill_gradient_v(card, frame_box, g['frame_light'], g['frame_mid'])

    # inner highlight strip (top-left shine)
    draw = ImageDraw.Draw(card)
    shine = (8, 8, w - 20, 28)
    fill_gradient_v(card, shine, '#FFFFFF', g['frame_light'])

    # inner dark line
    inner = (OUTER, OUTER, w - OUTER - 8, h - OUTER - 8)
    draw.rounded_rectangle(inner, radius=INNER_R, fill='#FFFDF8', outline=g['frame_dark'], width=2)

    # second inner grade ring
    ring = (OUTER + 3, OUTER + 3, w - OUTER - 11, h - OUTER - 11)
    draw.rounded_rectangle(ring, radius=INNER_R - 2, outline=g['frame_mid'], width=3)


def draw_hp_orb(draw: ImageDraw.ImageDraw, cx: int, cy: int, hp: int, g: dict, fonts):
    font_hp_label, font_hp_num = fonts
    r = 34
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill='#FFF7ED', outline=g['frame_dark'], width=3)
    draw.ellipse((cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5), outline=g['frame_light'], width=2)
    draw.text((cx - 18, cy - 28), 'HP', fill=g['accent'], font=font_hp_label)
    num = str(hp)
    bbox = draw.textbbox((0, 0), num, font=font_hp_num)
    tw = bbox[2] - bbox[0]
    draw.text((cx - tw / 2, cy - 4), num, fill='#111827', font=font_hp_num)


def draw_art_window(card: Image.Image, box: tuple[int, int, int, int], g: dict) -> tuple[int, int, int, int]:
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(card)

    # black TCG art border
    draw.rounded_rectangle(box, radius=14, fill='#0F172A', outline='#000000', width=2)

    inner = (x0 + 6, y0 + 6, x1 - 6, y1 - 6)
    fill_gradient_v(card, inner, '#E0F2FE', '#F0F9FF')
    draw = ImageDraw.Draw(card)

    # ground ellipse
    gx0, gx1 = inner[0] + 24, inner[2] - 24
    gy = inner[3] - 38
    draw.ellipse((gx0, gy - 10, gx1, gy + 28), fill='#BBF7D0', outline='#86EFAC', width=1)

    # subtle corner shine
    draw.polygon(
        [(inner[0], inner[1]), (inner[0] + 80, inner[1]), (inner[0], inner[1] + 80)],
        fill=(255, 255, 255, 35),
    )
    return inner


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> list[str]:
    lines: list[str] = []
    line = ''
    for ch in text:
        test = line + ch
        if draw.textlength(test, font=font) <= max_w:
            line = test
        else:
            if line:
                lines.append(line)
            line = ch
    if line:
        lines.append(line)
    return lines


def draw_card(
    char_path: Path,
    name: str,
    stage: str,
    grade_key: str,
    icon: str,
    description: str,
    *,
    skin: str = 'modern',
    card_no: int = 1,
    title: str = '포켓 에그',
) -> Image.Image:
    g = GRADE[grade_key]
    card = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
    draw_tcg_outer_frame(card, g)
    draw = ImageDraw.Draw(card)

    x0, y0 = OUTER + 8, OUTER + 8
    x1, y1 = CARD_W - OUTER - 16, CARD_H - OUTER - 16
    content_w = x1 - x0

    font_brand = load_font(30, bold=True)
    font_badge = load_font(20, bold=True)
    font_hp_label = load_font(14, bold=True)
    font_hp_num = load_font(26, bold=True)
    font_meta = load_font(21, bold=True)
    font_desc = load_font(18)
    font_small = load_font(14)
    font_ability = load_font(19, bold=True)

    # --- header band (sketch format: title + badge + HP) ---
    header_bottom = y0 + 88
    fill_gradient_h(card, (x0, y0, x1, header_bottom), g['header'], g['panel'])
    draw = ImageDraw.Draw(card)
    draw.line([(x0, header_bottom), (x1, header_bottom)], fill=g['frame_dark'], width=2)

    brand_color = '#5B21B6' if skin == 'modern' else '#9A3412'
    draw.text((x0 + 10, y0 + 8), title, fill=brand_color, font=font_brand)

    badge_box = (x0 + 10, y0 + 48, x0 + 108, y0 + 82)
    draw.rounded_rectangle(badge_box, radius=8, fill='#FFFFFF', outline=g['frame_mid'], width=2)
    draw.text((x0 + 22, y0 + 52), g['badge'], fill=g['accent'], font=font_badge)

    draw_hp_orb(draw, x1 - 48, y0 + 44, g['hp'], g, (font_hp_label, font_hp_num))

    # --- art window ---
    art_top = header_bottom + 10
    art_bottom = art_top + 468
    art_box = (x0 + 8, art_top, x1 - 8, art_bottom)
    inner = draw_art_window(card, art_box, g)
    draw = ImageDraw.Draw(card)

    if char_path.exists():
        char = Image.open(char_path).convert('RGBA')
        max_w = inner[2] - inner[0] - 32
        max_h = inner[3] - inner[1] - 56
        ratio = min(max_w / char.width, max_h / char.height)
        nw, nh = max(1, int(char.width * ratio)), max(1, int(char.height * ratio))
        char = char.resize((nw, nh), Image.Resampling.LANCZOS)
        px = inner[0] + (inner[2] - inner[0] - nw) // 2
        py = inner[1] + (inner[3] - inner[1] - nh) // 2 - 8
        card.paste(char, (px, py), char)

    # --- mid info strip: (stage) grade icon name ---
    mid_top = art_bottom + 10
    mid_bottom = mid_top + 44
    draw.rounded_rectangle((x0 + 8, mid_top, x1 - 8, mid_bottom), radius=8, fill=g['panel'], outline=g['frame_light'], width=2)
    stage_ko = STAGE_KO.get(stage, stage)
    meta = f'({stage_ko}) {g["label"]}  {icon}  {name}'
    draw.text((x0 + 18, mid_top + 10), meta, fill='#111827', font=font_meta)

    # --- bottom ability panel (Pokemon attack box style) ---
    panel_top = mid_bottom + 10
    panel_bottom = y1 - 8
    draw.rounded_rectangle((x0 + 8, panel_top, x1 - 8, panel_bottom), radius=10, fill='#FFFFFF', outline=g['frame_mid'], width=2)
    fill_gradient_h(card, (x0 + 10, panel_top + 2, x1 - 10, panel_top + 34), g['header'], '#FFFFFF')
    draw = ImageDraw.Draw(card)
    draw.line([(x0 + 14, panel_top + 36), (x1 - 14, panel_top + 36)], fill=g['frame_light'], width=2)

    draw.text((x0 + 18, panel_top + 8), f'{icon}  반려몬', fill=g['accent'], font=font_ability)

    desc_lines = wrap_text(draw, description, font_desc, content_w - 36)
    desc_y = panel_top + 44
    for line in desc_lines[:3]:
        draw.text((x0 + 18, desc_y), line, fill='#374151', font=font_desc)
        desc_y += 24

    # footer: set symbol + card number
    total = len(SPECIES) + 1
    skin_tag = 'M' if skin == 'modern' else 'C'
    draw.text((x0 + 18, y1 - 28), f'Pocket Egg · {skin_tag}', fill='#9CA3AF', font=font_small)
    no_text = f'#{card_no:03d}/{total:03d}'
    tw = draw.textlength(no_text, font=font_small)
    draw.text((x1 - 18 - tw, y1 - 28), no_text, fill='#9CA3AF', font=font_small)

    # legend/epic holo shimmer on outer frame ring only
    if grade_key in ('legend', 'epic'):
        holo = Image.new('RGBA', card.size, (0, 0, 0, 0))
        hd = ImageDraw.Draw(holo)
        for i in range(-CARD_H, CARD_W, 16):
            hd.line([(i, 0), (i + CARD_H, CARD_H)], fill=(255, 255, 255, 14), width=5)
        mask = Image.new('L', card.size, 0)
        md = ImageDraw.Draw(mask)
        md.rounded_rectangle((2, 2, card.size[0] - 10, card.size[1] - 10), radius=INNER_R + 4, fill=255)
        md.rounded_rectangle((OUTER + 2, OUTER + 2, card.size[0] - OUTER - 10, card.size[1] - OUTER - 10), fill=0)
        holo.putalpha(mask)
        card = Image.alpha_composite(card, holo)

    return card


def build_sheet(out_dir: Path, filename: str) -> None:
    cols = 4
    thumb_w, thumb_h = CARD_W // 3, CARD_H // 3
    cards = sorted(out_dir.glob('*_card.png'))
    if not cards:
        return
    rows = math.ceil(len(cards) / cols)
    sheet = Image.new('RGBA', (cols * thumb_w + 24, rows * thumb_h + 24), (235, 232, 225, 255))
    for i, path in enumerate(cards):
        im = Image.open(path).convert('RGBA')
        im = im.resize((thumb_w - 8, thumb_h - 8), Image.Resampling.LANCZOS)
        x = 12 + (i % cols) * thumb_w
        y = 12 + (i // cols) * thumb_h
        sheet.paste(im, (x, y), im)
    sheet.save(out_dir / filename)


def generate_set(skin: str) -> list[dict]:
    char_base = CHAR_DIR if skin == 'modern' else CHAR_DIR / 'classic'
    out_dir = OUT_DIR if skin == 'modern' else OUT_DIR / 'classic'
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest: list[dict] = []

    egg_path = char_base / 'egg.png'
    if not egg_path.exists() and skin == 'modern':
        egg_path = CHAR_DIR / 'egg.png'
    promo = draw_card(
        egg_path,
        '포켓 에그',
        'egg',
        'normal',
        '🌈',
        '무지개 알에서 깨어나는 반려몬의 모험이 시작됩니다!',
        skin=skin,
        card_no=1,
        title='포켓 에그',
    )
    promo_name = 'egg_포켓에그_card.png'
    promo.save(out_dir / promo_name)
    manifest.append({'skin': skin, 'file': promo_name, 'name': '포켓 에그', 'type': 'promo'})

    for idx, (file_id, name, stage, grade, icon, desc) in enumerate(SPECIES, start=2):
        src = char_base / f'{file_id}.png'
        card = draw_card(src, name, stage, grade, icon, desc, skin=skin, card_no=idx)
        out_name = f'{file_id}_{name}_card.png'
        card.save(out_dir / out_name)
        manifest.append({'skin': skin, 'id': file_id, 'name': name, 'stage': stage, 'grade': grade, 'file': out_name})

    preview_name = 'all-character-cards-preview.png' if skin == 'modern' else 'all-character-cards-preview-classic.png'
    build_sheet(out_dir, preview_name)
    return manifest


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    for skin in ('modern', 'classic'):
        manifest.extend(generate_set(skin))

    (OUT_DIR / 'manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    print(f'created {len(manifest)} TCG cards (modern + classic)')


if __name__ == '__main__':
    main()
