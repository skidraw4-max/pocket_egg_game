/**
 * touchReactions.ts — 캐릭터 터치 반응 (말풍선·모션·파티클)
 */
import type { PetProfile } from './gameState';
import { UNLOCKED_EMOTION_PHRASES, todayStr } from './gameState';

export type TouchMotion = 'squish' | 'hop' | 'tilt-left' | 'tilt-right' | 'egg-shake';

export type TouchEmotion = 'idle' | 'happy' | 'hungry' | 'dirty' | 'tired' | 'bored' | 'love';

export interface TouchReactionInput {
  emotion: TouchEmotion;
  stage: PetProfile['stage'];
  intimacy: number;
  unlockedEmotions: string[];
  comboCount: number;
  hasExpBoost: boolean;
  hasTouchExpPerk: boolean;
}

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const BUBBLE_COMMON = ['응? 나 불렀어?', '히히~', '만져줘서 고마워!', '간지러워~', '또 만져줘!'];
const BUBBLE_EGG = ['톡톡… 안에서 움직여!', '더 만져주면 부화할지도?', '따뜻해… 좋아!', '쪽!'];
const BUBBLE_HAPPY = ['기분 좋아~!', '히히, 간지러워!', '나랑 놀자!'];
const BUBBLE_LOVE = ['또 만져줘! 💕', '좋아해~!', '너무 좋아!'];
const BUBBLE_HUNGRY = ['…밥도 주면 좋겠는데?', '배고파… 그래도 만져줘서 고마워'];
const BUBBLE_DIRTY = ['씻고 싶어…', '앗, 더 더러워질 것 같아…'];
const BUBBLE_TIRED = ['5분만… 졸려…', '응… 조금만 더…'];
const BUBBLE_BORED = ['심심해… 놀아줘!', '뭐 할까…', '재미없어…'];
const BUBBLE_SPAM = ['너무 많이 만지면 간지러워~', '잠깐만! 숨 쉬어야 해~', '앗, 너무 많이!'];
const BUBBLE_FIRST_TODAY = ['오늘도 와줘서 고마워!', '보고 싶었어~', '왔구나! 반가워!'];

const EMOTION_POOL: Record<TouchEmotion, string[]> = {
  idle: BUBBLE_COMMON,
  happy: BUBBLE_HAPPY,
  hungry: BUBBLE_HUNGRY,
  dirty: BUBBLE_DIRTY,
  tired: BUBBLE_TIRED,
  bored: BUBBLE_BORED,
  love: BUBBLE_LOVE,
};

const SESSION_GREET_KEY = 'pocket_egg_touch_greet_date';

export function consumeFirstTouchGreetingToday(): boolean {
  try {
    const today = todayStr();
    if (sessionStorage.getItem(SESSION_GREET_KEY) === today) return false;
    sessionStorage.setItem(SESSION_GREET_KEY, today);
    return true;
  } catch {
    return false;
  }
}

export function pickTouchBubble(input: TouchReactionInput): string {
  if (input.comboCount >= 5) return pick(BUBBLE_SPAM);
  if (input.comboCount >= 3 && Math.random() < 0.6) return pick(BUBBLE_SPAM);

  if (input.stage === 'egg') return pick(BUBBLE_EGG);

  if (input.intimacy >= 90 && input.unlockedEmotions.includes('milestone_doki') && Math.random() < 0.25) {
    return UNLOCKED_EMOTION_PHRASES.milestone_doki;
  }
  if (input.emotion === 'love' && input.unlockedEmotions.includes('milestone_soulmate') && Math.random() < 0.3) {
    return UNLOCKED_EMOTION_PHRASES.milestone_soulmate;
  }

  const pool = EMOTION_POOL[input.emotion] ?? BUBBLE_COMMON;
  return pick(pool);
}

export function pickTouchBubbleWithGreeting(input: TouchReactionInput, isFirstToday: boolean): string {
  if (isFirstToday && input.comboCount === 1 && Math.random() < 0.65) {
    return pick(BUBBLE_FIRST_TODAY);
  }
  return pickTouchBubble(input);
}

export function pickTouchMotion(stage: PetProfile['stage'], emotion: TouchEmotion): TouchMotion {
  if (stage === 'egg') return 'egg-shake';
  if (emotion === 'happy' || emotion === 'love') {
    return Math.random() < 0.5 ? 'hop' : 'squish';
  }
  if (stage === 'baby' || stage === 'child') {
    return Math.random() < 0.5 ? 'squish' : 'hop';
  }
  return Math.random() < 0.5 ? 'tilt-left' : 'tilt-right';
}

export function pickTouchParticles(input: TouchReactionInput): string[] {
  const particles: string[] = [];
  const primary =
    input.emotion === 'love' ? '💕'
    : input.hasExpBoost ? '🌟'
    : input.hasTouchExpPerk && Math.random() < 0.35 ? '🌙'
    : Math.random() < 0.5 ? '💕' : '✨';

  particles.push(primary);

  if (input.emotion === 'love' || input.emotion === 'happy') {
    particles.push(Math.random() < 0.5 ? '✨' : '⭐');
  } else if (Math.random() < 0.4) {
    particles.push('✨');
  }

  return particles.slice(0, 2);
}

export const TOUCH_MOTION_ANIMATION: Record<TouchMotion, string> = {
  squish: 'touch-squish 0.45s cubic-bezier(0.23, 1, 0.32, 1)',
  hop: 'touch-hop 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
  'tilt-left': 'touch-tilt-left 0.4s ease-out',
  'tilt-right': 'touch-tilt-right 0.4s ease-out',
  'egg-shake': 'touch-egg-shake 0.5s ease-in-out',
};
