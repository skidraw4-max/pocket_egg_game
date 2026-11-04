/**
 * 가구(Decor) 방 혜택 — 보유 + 방에 표시(hidden 아님) 시 패시브 적용
 */

import type { WallpaperId } from './roomAssets';

const DECAY_REDUCE_CAP = 20;

export interface RoomPerkDaily {
  date: string;
  touchIntimacyCount: number;
}

export interface RoomPerkContext {
  room: {
    wallpaper: string;
    furniture: string[];
    hiddenDecor?: string[];
  };
  pet: {
    stage: string;
    intimacy: number;
  };
  expBoostUntil?: number;
  roomPerkDaily?: RoomPerkDaily;
}

export type DecorPerkKind =
  | 'mood_decay_reduce'
  | 'hunger_decay_reduce'
  | 'clean_decay_reduce'
  | 'fatigue_decay_reduce'
  | 'feed_mood_bonus'
  | 'feed_hunger_bonus'
  | 'play_mood_bonus'
  | 'play_exp_bonus'
  | 'sleep_mood_bonus'
  | 'sleep_fatigue_bonus'
  | 'touch_exp_bonus'
  | 'touch_intimacy_bonus'
  | 'intimacy_gain_mult'
  | 'clean_effect_bonus';

export interface DecorPerkDef {
  decorId: string;
  /** 상점·UI 한 줄 설명 */
  label: string;
  kind: DecorPerkKind;
  value: number;
  synergyWallpaper?: WallpaperId;
  synergyValue?: number;
  synergyLabel?: string;
  /** egg/baby stage only */
  stages?: string[];
  /** adult/mythic only */
  minStage?: 'adult';
  /** exp boost 활성일 때만 (별빛 모빌) */
  requiresExpBoost?: boolean;
  /** exp boost 없을 때만 (달 밤등) */
  requiresNoExpBoost?: boolean;
  touchIntimacyDailyCap?: number;
}

export interface AggregatedRoomPerks {
  moodDecayReducePct: number;
  hungerDecayReducePct: number;
  cleanDecayReducePct: number;
  fatigueDecayReducePct: number;
  feedMoodBonus: number;
  feedHungerBonus: number;
  playMoodBonus: number;
  playExpBonusPct: number;
  sleepMoodBonus: number;
  sleepFatigueBonusPct: number;
  touchExpBonusPct: number;
  touchIntimacyBonus: number;
  touchIntimacyDailyCap: number;
  intimacyGainMult: number;
  cleanEffectBonusPct: number;
  activeLabels: string[];
  activeCount: number;
}

export const DECOR_PERK_DEFS: DecorPerkDef[] = [
  // —— MVP 8종 ——
  {
    decorId: 'decor_forest_mushroom_lamp',
    label: '기분 감소 −5%',
    kind: 'mood_decay_reduce',
    value: 5,
    synergyWallpaper: 'wallpaper_forest',
    synergyValue: 8,
    synergyLabel: '마법 숲 배경: −8%',
  },
  {
    decorId: 'decor_ocean_coral_shelf',
    label: '배고픔 감소 −8%',
    kind: 'hunger_decay_reduce',
    value: 8,
    synergyWallpaper: 'wallpaper_ocean',
    synergyValue: 12,
    synergyLabel: '바닷속 배경: −12%',
  },
  {
    decorId: 'decor_cloud_moon_nightlight',
    label: '터치 EXP +5%',
    kind: 'touch_exp_bonus',
    value: 5,
    requiresNoExpBoost: true,
    synergyWallpaper: 'wallpaper_cloud',
    synergyValue: 8,
    synergyLabel: '구름 성 배경: +8%',
  },
  {
    decorId: 'decor_candy_cake_display',
    label: '먹이 기분 +2',
    kind: 'feed_mood_bonus',
    value: 2,
    synergyWallpaper: 'wallpaper_candy',
    synergyValue: 3,
    synergyLabel: '과자 가게 배경: +3',
  },
  {
    decorId: 'decor_egg_nest',
    label: '알·아기 친밀도 +10%',
    kind: 'intimacy_gain_mult',
    value: 1.1,
    stages: ['egg', 'baby'],
  },
  {
    decorId: 'decor_ocean_bubble_lamp',
    label: '기분 감소 −5%',
    kind: 'mood_decay_reduce',
    value: 5,
    synergyWallpaper: 'wallpaper_ocean',
    synergyValue: 8,
    synergyLabel: '바닷속 배경: −8%',
  },
  {
    decorId: 'decor_candy_lollipop_tree',
    label: '기분 감소 −6%',
    kind: 'mood_decay_reduce',
    value: 6,
    synergyWallpaper: 'wallpaper_candy',
    synergyValue: 10,
    synergyLabel: '과자 가게 배경: −10%',
  },
  {
    decorId: 'decor_pet_bowl',
    label: '먹이 배고픔 +3',
    kind: 'feed_hunger_bonus',
    value: 3,
  },
  // —— 기존 12종 소급 (약한 패시브) ——
  {
    decorId: 'decor_flower',
    label: '청결 감소 −3%',
    kind: 'clean_decay_reduce',
    value: 3,
  },
  {
    decorId: 'decor_star',
    label: '기분 감소 −3%',
    kind: 'mood_decay_reduce',
    value: 3,
  },
  {
    decorId: 'decor_sofa',
    label: '수면 피로 회복 +2%',
    kind: 'sleep_fatigue_bonus',
    value: 2,
  },
  {
    decorId: 'decor_bookshelf',
    label: '놀기 EXP +2%',
    kind: 'play_exp_bonus',
    value: 2,
  },
  {
    decorId: 'decor_rainbow',
    label: '기분 감소 −4%',
    kind: 'mood_decay_reduce',
    value: 4,
  },
  {
    decorId: 'decor_cloud_bed',
    label: '수면 기분 +2',
    kind: 'sleep_mood_bonus',
    value: 2,
  },
  {
    decorId: 'social_rainbow_carpet',
    label: '터치 친밀 +0.1 (일 2회)',
    kind: 'touch_intimacy_bonus',
    value: 0.1,
    touchIntimacyDailyCap: 2,
  },
  {
    decorId: 'social_star_mobile',
    label: 'EXP 버프 중 기분 감소 −5%',
    kind: 'mood_decay_reduce',
    value: 5,
    requiresExpBoost: true,
  },
  {
    decorId: 'social_crown_cushion',
    label: '성체 기분 감소 −3%',
    kind: 'mood_decay_reduce',
    value: 3,
    minStage: 'adult',
  },
];

const PERK_BY_DECOR = new Map(DECOR_PERK_DEFS.map(p => [p.decorId, p]));

function getTodayKey(now = Date.now()): string {
  return new Date(now).toLocaleDateString('sv-SE');
}

function isExpBoostActive(ctx: RoomPerkContext, now: number): boolean {
  return typeof ctx.expBoostUntil === 'number' && ctx.expBoostUntil > now;
}

function isAdultPlus(stage: string): boolean {
  return stage === 'adult' || stage === 'mythic';
}

export function getActiveDecorIds(ctx: RoomPerkContext): string[] {
  const hidden = new Set(ctx.room.hiddenDecor ?? []);
  return (ctx.room.furniture ?? []).filter(id => !hidden.has(id));
}

function effectiveValue(def: DecorPerkDef, wallpaper: string): number {
  if (def.synergyWallpaper && wallpaper === def.synergyWallpaper && def.synergyValue != null) {
    return def.synergyValue;
  }
  return def.value;
}

function perkApplies(def: DecorPerkDef, ctx: RoomPerkContext, now: number): boolean {
  if (def.requiresExpBoost && !isExpBoostActive(ctx, now)) return false;
  if (def.requiresNoExpBoost && isExpBoostActive(ctx, now)) return false;
  if (def.stages && !def.stages.includes(ctx.pet.stage)) return false;
  if (def.minStage === 'adult' && !isAdultPlus(ctx.pet.stage)) return false;
  return true;
}

export function getDecorPerkDef(decorId: string): DecorPerkDef | undefined {
  return PERK_BY_DECOR.get(decorId);
}

export function getDecorPerkShopLines(decorId: string, wallpaper?: string): string[] {
  const def = PERK_BY_DECOR.get(decorId);
  if (!def) return [];

  const lines = [`🏠 ${def.label}`];
  if (def.synergyWallpaper && def.synergyLabel) {
    const active = wallpaper === def.synergyWallpaper;
    lines.push(active ? `✨ ${def.synergyLabel}` : `✨ ${def.synergyLabel.replace(/[:：].*/, '')} (배경 일치 시)`);
  }
  return lines;
}

export function getAggregatedRoomPerks(ctx: RoomPerkContext, now = Date.now()): AggregatedRoomPerks {
  const wallpaper = ctx.room.wallpaper ?? 'default';
  const perks: AggregatedRoomPerks = {
    moodDecayReducePct: 0,
    hungerDecayReducePct: 0,
    cleanDecayReducePct: 0,
    fatigueDecayReducePct: 0,
    feedMoodBonus: 0,
    feedHungerBonus: 0,
    playMoodBonus: 0,
    playExpBonusPct: 0,
    sleepMoodBonus: 0,
    sleepFatigueBonusPct: 0,
    touchExpBonusPct: 0,
    touchIntimacyBonus: 0,
    touchIntimacyDailyCap: 0,
    intimacyGainMult: 1,
    cleanEffectBonusPct: 0,
    activeLabels: [],
    activeCount: 0,
  };

  for (const decorId of getActiveDecorIds(ctx)) {
    const def = PERK_BY_DECOR.get(decorId);
    if (!def || !perkApplies(def, ctx, now)) continue;

    const val = effectiveValue(def, wallpaper);
    perks.activeCount += 1;

    switch (def.kind) {
      case 'mood_decay_reduce':
        perks.moodDecayReducePct += val;
        perks.activeLabels.push(`기분 −${val}%`);
        break;
      case 'hunger_decay_reduce':
        perks.hungerDecayReducePct += val;
        perks.activeLabels.push(`배고픔 −${val}%`);
        break;
      case 'clean_decay_reduce':
        perks.cleanDecayReducePct += val;
        perks.activeLabels.push(`청결 −${val}%`);
        break;
      case 'fatigue_decay_reduce':
        perks.fatigueDecayReducePct += val;
        perks.activeLabels.push(`피로 −${val}%`);
        break;
      case 'feed_mood_bonus':
        perks.feedMoodBonus += val;
        perks.activeLabels.push(`먹이 기분 +${val}`);
        break;
      case 'feed_hunger_bonus':
        perks.feedHungerBonus += val;
        perks.activeLabels.push(`먹이 배고픔 +${val}`);
        break;
      case 'play_mood_bonus':
        perks.playMoodBonus += val;
        break;
      case 'play_exp_bonus':
        perks.playExpBonusPct += val;
        perks.activeLabels.push(`놀기 EXP +${val}%`);
        break;
      case 'sleep_mood_bonus':
        perks.sleepMoodBonus += val;
        perks.activeLabels.push(`수면 기분 +${val}`);
        break;
      case 'sleep_fatigue_bonus':
        perks.sleepFatigueBonusPct += val;
        perks.activeLabels.push(`수면 피로 +${val}%`);
        break;
      case 'touch_exp_bonus':
        perks.touchExpBonusPct += val;
        perks.activeLabels.push(`터치 EXP +${val}%`);
        break;
      case 'touch_intimacy_bonus':
        perks.touchIntimacyBonus += val;
        perks.touchIntimacyDailyCap = Math.max(
          perks.touchIntimacyDailyCap,
          def.touchIntimacyDailyCap ?? 0,
        );
        break;
      case 'intimacy_gain_mult':
        perks.intimacyGainMult = Math.max(perks.intimacyGainMult, val);
        perks.activeLabels.push(`친밀 +${Math.round((val - 1) * 100)}%`);
        break;
      case 'clean_effect_bonus':
        perks.cleanEffectBonusPct += val;
        break;
    }
  }

  perks.moodDecayReducePct = Math.min(perks.moodDecayReducePct, DECAY_REDUCE_CAP);
  perks.hungerDecayReducePct = Math.min(perks.hungerDecayReducePct, DECAY_REDUCE_CAP);
  perks.cleanDecayReducePct = Math.min(perks.cleanDecayReducePct, DECAY_REDUCE_CAP);
  perks.fatigueDecayReducePct = Math.min(perks.fatigueDecayReducePct, DECAY_REDUCE_CAP);

  return perks;
}

export function getDecayMultiplier(reducePct: number): number {
  return 1 - Math.min(reducePct, DECAY_REDUCE_CAP) / 100;
}

export function applyIntimacyWithPerks(
  base: number,
  ctx: RoomPerkContext,
  perks: AggregatedRoomPerks,
): number {
  let gain = base;
  if (perks.intimacyGainMult > 1 && (ctx.pet.stage === 'egg' || ctx.pet.stage === 'baby')) {
    gain *= perks.intimacyGainMult;
  }
  return gain;
}

export function getTouchIntimacyBonus(
  ctx: RoomPerkContext,
  perks: AggregatedRoomPerks,
  now = Date.now(),
): { bonus: number; consumeDaily: boolean } {
  if (perks.touchIntimacyBonus <= 0 || perks.touchIntimacyDailyCap <= 0) {
    return { bonus: 0, consumeDaily: false };
  }

  const today = getTodayKey(now);
  const daily = ctx.roomPerkDaily;
  const count = daily?.date === today ? daily.touchIntimacyCount : 0;

  if (count >= perks.touchIntimacyDailyCap) {
    return { bonus: 0, consumeDaily: false };
  }

  return { bonus: perks.touchIntimacyBonus, consumeDaily: true };
}

export function withTouchIntimacyDailyUsed(
  ctx: RoomPerkContext,
  now = Date.now(),
): RoomPerkContext {
  const today = getTodayKey(now);
  const prev = ctx.roomPerkDaily;
  const count = prev?.date === today ? prev.touchIntimacyCount : 0;

  return {
    ...ctx,
    roomPerkDaily: { date: today, touchIntimacyCount: count + 1 },
  };
}

export function summarizeActivePerks(ctx: RoomPerkContext, now = Date.now()): string[] {
  const perks = getAggregatedRoomPerks(ctx, now);
  if (perks.activeCount === 0) return [];
  return perks.activeLabels.slice(0, 4);
}
