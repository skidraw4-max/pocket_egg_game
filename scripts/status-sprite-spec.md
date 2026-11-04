# 상태 스프라이트 아트 가이드 (4단계)

## 목표
캐릭터 PNG **1장**이 상태를 전부 표현한다. UI(Zzz, 말풍선, 이모지)와 겹치지 않는다.

## 파일 규칙
```
client/public/characters/status/{skin}/{speciesId}/{stage}/{stat}_{tier}.png
```
- **skin**: `modern` | `classic`
- **speciesId**: `basicmon`, `powermon`, … (17종)
- **stage**: `baby` | `child` | `teen` | `adult` | `mythic` (egg 제외)
- **stat**: `clean` | `fatigue` | `hunger` | `mood`
- **tier**: `60`(경미) | `30`(중간) | `10`(심각)

## 공통
- PNG, 투명 배경, 최대 384px
- PNG에 넣지 않음: Zzz, ?, 말풍선, UI 아이콘, 전체 비네트/밴드

## 기본몬 레퍼런스 (baby · modern)

| stat | tier 60 | tier 30 | tier 10 |
|------|---------|---------|---------|
| **fatigue** | 눈 살짝 감김(arc) | 눈 감음 + 고개 2° 기울임 | 눈 완전히 감음 + 5° 기울임 + 볼 blush |
| **hunger** | 작은 침 한 방울 | 눈 highlight + 침 | 창백(tone) + 어지러운 눈 |
| **clean** | 몸통 더트 6점 | 더트 14점 | 더트 24점 + 이마/볼 집중 |
| **mood** | 입 일자 | 고개 8° 기울임 + 한숨 방울 | 축 처짐(아래 shift) + 슬픈 눈 |

## 우선순위 (제작)
- **P0**: basicmon · baby · modern · tier 10·30 (8장)
- **P1**: TOP5 · baby · modern · tier 10·30 (40장)
- **P2**: 17종 · baby · modern · 전 tier (204장)
- **P3**: 17종 · child·teen·adult·mythic · modern · 전 tier (816장) — classic 제외
- **P4**: AI/일러스트 완성 PNG로 placeholder 교체 (동일 경로 덮어쓰기)

TOP5: `basicmon`, `powermon`, `wizmon`, `lovelemon`, `greenmon`

## 생성 명령
```bash
python scripts/generate-status-expressions.py --phase p3
python scripts/optimize-status-expressions.py
```
