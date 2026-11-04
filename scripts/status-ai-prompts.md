# AI Status Sprite Sheet Prompts (P4)

17종 × 4×3 스프라이트 시트. `sheets/{speciesId}.png` 저장 후:

```bash
python scripts/split-status-sprite-sheet.py --all-sheets
```

## 공통 규칙 (모든 프롬프트에 포함)
- 4 rows × 3 columns sprite sheet, equal cell size
- Row order: clean, fatigue, hunger, mood
- Column order: mild (tier 60), medium (tier 30), severe (tier 10)
- Transparent background, NO text, NO Zzz, NO speech bubbles
- Kawaii 3D plush mobile game character, centered in each cell
- Match reference character design exactly

## Grid expressions

### clean (row 1)
- 60: 2-3 small mud spots on body
- 30: many dirt spots on face and paws
- 10: very dirty, mud on face and belly

### fatigue (row 2)
- 60: eyes half-closed, sleepy
- 30: eyes closed, head tilted slightly
- 10: eyes fully closed, head tilted more, tired slouch

### hunger (row 3)
- 60: tiny drool drop, hopeful eyes
- 30: bigger drool, shiny pleading eyes
- 10: dizzy spiral eyes, pale, very hungry

### mood (row 4)
- 60: flat neutral mouth, bored
- 30: head tilted, sigh droplet near cheek
- 10: slumped posture, sad downturned eyes

## Species reference images
| id | reference PNG |
|----|---------------|
| basicmon | characters/basicmon.png |
| powermon | characters/powermon.png |
| wizmon | characters/wizmon.png |
| lovelemon | characters/lovelemon.png |
| greenmon | characters/greenmon.png |
| thundermon | characters/thundermon.png |
| dragonmon | characters/dragonmon.png |
| magicmon | characters/magicmon.png |
| angelmon | characters/angelmon.png |
| forestmon | characters/forestmon.png |
| moonlightmon | characters/moonlightmon.png |
| crystalmon | characters/crystalmon.png |
| legendmon | characters/legendmon.png |
| infernomon | characters/infernomon.png |
| oraclemon | characters/oraclemon.png |
| seraphimon | characters/seraphimon.png |
| gaiamon | characters/gaiamon.png |

## Output structure (after split)
```
client/public/characters/status-illustrated/modern/{speciesId}/{stage}/{stat}_{tier}.png
```

User replaces game assets after review:
```bash
# 미리보기 (복사 목록만 출력)
python scripts/apply-illustrated-status-sprites.py --dry-run

# 확인 후 게임 에셋에 적용
python scripts/apply-illustrated-status-sprites.py
```

## AI 제작 결과 (P4)
- **시트**: `status-illustrated/sheets/{speciesId}.png` (17장, 4×3 그리드)
- **분할본**: `status-illustrated/modern/{speciesId}/{stage}/{stat}_{tier}.png` (1020장)
- **교체 대상**: `status/modern/*` (classic 제외)
