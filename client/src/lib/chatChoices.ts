/**
 * chatChoices.ts — 선택형 대화 (1~4단계: 고정·맥락·행동연결·분기)
 */
import type { PetProfile, PetStatus, GameState } from './gameState';
import type { ChatResponse } from './chatKeywords';
import { todayStr } from './gameState';

export type ChatEmotion = 'idle' | 'happy' | 'hungry' | 'dirty' | 'tired' | 'love';

export type ChatLinkAction =
  | 'feed'
  | 'play'
  | 'play_ball'
  | 'play_puzzle'
  | 'play_ribbon'
  | 'clean'
  | 'sleep'
  | 'decor';

export interface ChatChoiceContext {
  pet: PetProfile;
  status: PetStatus;
  emotion: ChatEmotion;
  intimacy: number;
  unlockedEmotions: string[];
}

export interface ChatChoiceWhen {
  minIntimacy?: number;
  stages?: PetProfile['stage'][];
  hungerBelow?: number;
  hungerAbove?: number;
  cleanBelow?: number;
  fatigueAbove?: number;
  emotions?: ChatEmotion[];
  eggOnly?: boolean;
  excludeStages?: PetProfile['stage'][];
}

export interface ChatBranch {
  id: string;
  label: string;
  icon: string;
  responses: ChatResponse[];
  action?: ChatLinkAction;
}

export interface ChatChoice {
  id: string;
  label: string;
  icon: string;
  /** 높을수록 맥락 일치 시 상단 노출 */
  priority: number;
  responses: ChatResponse[];
  action?: ChatLinkAction;
  branches?: ChatBranch[];
  when?: ChatChoiceWhen;
  /** 맥락 없을 때도 항상 후보 (기본 6종) */
  core?: boolean;
}

export interface ResolvedChat {
  text: string;
  moodEffect?: number;
  action?: ChatLinkAction;
}

export const CHAT_DAILY_LIMIT = 30;
export const MAX_VISIBLE_CHOICES = 6;

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const withPetName = (text: string, petName: string) => text.replace(/포코/g, petName);

function matchesWhen(when: ChatChoiceWhen | undefined, ctx: ChatChoiceContext): boolean {
  if (!when) return true;
  if (when.eggOnly && ctx.pet.stage !== 'egg') return false;
  if (when.stages && !when.stages.includes(ctx.pet.stage)) return false;
  if (when.excludeStages?.includes(ctx.pet.stage)) return false;
  if (when.minIntimacy != null && ctx.intimacy < when.minIntimacy) return false;
  if (when.hungerBelow != null && ctx.status.hunger >= when.hungerBelow) return false;
  if (when.hungerAbove != null && ctx.status.hunger <= when.hungerAbove) return false;
  if (when.cleanBelow != null && ctx.status.clean >= when.cleanBelow) return false;
  if (when.fatigueAbove != null && ctx.status.fatigue <= when.fatigueAbove) return false;
  if (when.emotions && !when.emotions.includes(ctx.emotion)) return false;
  return true;
}

function contextBoost(choice: ChatChoice, ctx: ChatChoiceContext): number {
  let boost = 0;
  if (choice.id === 'feed' && ctx.status.hunger < 50) boost += 18;
  if (choice.id === 'bath' && ctx.status.clean < 50) boost += 18;
  const w = choice.when;
  if (!w) return boost;
  if (w.hungerBelow != null && ctx.status.hunger < w.hungerBelow) boost += 20;
  if (w.cleanBelow != null && ctx.status.clean < w.cleanBelow) boost += 20;
  if (w.fatigueAbove != null && ctx.status.fatigue > w.fatigueAbove) boost += 20;
  if (w.emotions?.includes(ctx.emotion)) boost += 10;
  if (w.minIntimacy != null && ctx.intimacy >= w.minIntimacy) boost += 5;
  if (w.eggOnly && ctx.pet.stage === 'egg') boost += 25;
  return boost;
}

export const CHAT_CHOICES: ChatChoice[] = [
  // —— core 6 ——
  {
    id: 'feed',
    label: '밥 줘!',
    icon: '🍖',
    priority: 10,
    core: true,
    action: 'feed',
    responses: [
      { text: '저도 배고파요! 밥 줘요~ 꼬르륵~', emotion: 'sad' },
      { text: '냠냠! 뭔가 맛있는 거 주세요!', emotion: 'normal' },
      { text: '먹이주기 버튼으로 밥 주세요!', emotion: 'sad' },
    ],
  },
  {
    id: 'play',
    label: '같이 놀자',
    icon: '🎾',
    priority: 10,
    core: true,
    branches: [
      {
        id: 'ball',
        label: '공놀이',
        icon: '⚽',
        action: 'play_ball',
        responses: [
          { text: '와! 공 던져요! 신나요! ⚽', emotion: 'happy', moodEffect: 3 },
          { text: '공놀이 최고! 빨리 놀아요~', emotion: 'happy', moodEffect: 3 },
        ],
      },
      {
        id: 'puzzle',
        label: '별 퍼즐',
        icon: '⭐',
        action: 'play_puzzle',
        responses: [
          { text: '퍼즐도 좋아요! 같이 맞춰봐요!', emotion: 'happy', moodEffect: 3 },
          { text: '별 퍼즐 도전! 저 도와줄게요~', emotion: 'happy', moodEffect: 2 },
        ],
      },
      {
        id: 'more',
        label: '다른 놀이',
        icon: '🎀',
        action: 'play',
        responses: [
          { text: '뭐가 있을까요? 놀이 목록에서 골라요!', emotion: 'happy', moodEffect: 3 },
          { text: '같이 놀아요! 재밌는 거 하고 싶어요!', emotion: 'happy', moodEffect: 3 },
        ],
      },
    ],
    responses: [
      { text: '같이 놀아요! 신나요! 🎾', emotion: 'happy', moodEffect: 3 },
    ],
  },
  {
    id: 'love',
    label: '좋아해',
    icon: '💕',
    priority: 8,
    core: true,
    responses: [
      { text: '저도 좋아해요! 정말 정말요! 💕', emotion: 'love', moodEffect: 5 },
      { text: '헤헤~ 저도요! 항상 함께해요!', emotion: 'love', moodEffect: 5 },
    ],
  },
  {
    id: 'mood',
    label: '기분 어때?',
    icon: '😊',
    priority: 8,
    core: true,
    responses: [
      { text: '지금 기분 좋아요! 당신 덕분이에요~ 😊', emotion: 'happy' },
      { text: '네, 괜찮아요! 같이 있으면 행복해요!', emotion: 'happy' },
    ],
  },
  {
    id: 'bath',
    label: '목욕할래?',
    icon: '🛁',
    priority: 8,
    core: true,
    action: 'clean',
    responses: [
      { text: '목욕시켜 주세요! 깨끗해지고 싶어요~', emotion: 'normal' },
      { text: '목욕 버튼 눌러줘요! 시원해질 것 같아요!', emotion: 'happy' },
    ],
  },
  {
    id: 'bye',
    label: '안녕',
    icon: '👋',
    priority: 5,
    core: true,
    responses: [
      { text: '또 와줘요! 기다리고 있을게요~ 👋', emotion: 'happy' },
      { text: '안녕히 가세요! 빨리 돌아와요!', emotion: 'sad' },
    ],
  },

  // —— context / extended ——
  {
    id: 'sleep',
    label: '재워줄게',
    icon: '🌙',
    priority: 12,
    action: 'sleep',
    responses: [
      { text: '저도 조금 졸려요... 재워줄래요?', emotion: 'sad' },
      { text: '휴식 버튼 눌러주면 잘 잘게요~ 💤', emotion: 'normal' },
    ],
    when: { fatigueAbove: 55 },
  },
  {
    id: 'praise',
    label: '칭찬해',
    icon: '✨',
    priority: 7,
    responses: [
      { text: '헤헤~ 칭찬해줘서 고마워요! 기분 최고예요!', emotion: 'love', moodEffect: 5 },
      { text: '정말요? 너무 기뻐요! 더 열심히 할게요!', emotion: 'happy', moodEffect: 5 },
    ],
  },
  {
    id: 'thanks',
    label: '고마워',
    icon: '🙏',
    priority: 6,
    responses: [
      { text: '저야말로 고마워요! 항상 돌봐줘서요~', emotion: 'love', moodEffect: 3 },
      { text: '천만에요! 앞으로도 잘 부탁해요!', emotion: 'happy', moodEffect: 2 },
    ],
  },
  {
    id: 'name',
    label: '이름이 뭐야?',
    icon: '❓',
    priority: 6,
    responses: [
      { text: '저는 포코예요! 당신의 소중한 반려몬이에요! 😊', emotion: 'happy' },
      { text: '포코라고 해요~ 잘 부탁해요!', emotion: 'happy' },
    ],
  },
  {
    id: 'evolve',
    label: '진화는?',
    icon: '🦋',
    priority: 8,
    responses: [
      { text: '저도 빨리 진화하고 싶어요! 열심히 할게요!', emotion: 'happy' },
      { text: '많이 먹고 놀면 진화할 수 있어요! 기대돼요~', emotion: 'happy' },
    ],
    when: { excludeStages: ['mythic'] },
  },
  {
    id: 'egg_hatch',
    label: '언제 부화해?',
    icon: '🥚',
    priority: 15,
    responses: [
      { text: '열심히 먹고 자라면 곧 부화할 거예요!', emotion: 'happy' },
      { text: '안에서 두근두근… 더 돌봐주세요!', emotion: 'love', moodEffect: 2 },
    ],
    when: { eggOnly: true },
  },
  {
    id: 'comfort',
    label: '힘내',
    icon: '💪',
    priority: 9,
    responses: [
      { text: '제가 옆에 있을게요! 힘내요! 💕', emotion: 'love', moodEffect: 3 },
      { text: '슬프면 저랑 놀아요! 기분 좋아질 거예요!', emotion: 'happy', moodEffect: 2 },
    ],
    when: { emotions: ['hungry', 'dirty', 'tired'] },
  },
  {
    id: 'room',
    label: '방 꾸미자',
    icon: '🏠',
    priority: 7,
    action: 'decor',
    responses: [
      { text: '예쁜 방이면 기분도 좋아져요! 같이 꾸며요!', emotion: 'happy', moodEffect: 2 },
      { text: '가구도 사고 배치도 바꿀 수 있어요! 신나요~', emotion: 'happy' },
    ],
  },
  {
    id: 'soulmate',
    label: '영원히 함께',
    icon: '💖',
    priority: 14,
    responses: [
      { text: '영원히 함께하자! ✨💕', emotion: 'love', moodEffect: 5 },
    ],
    when: { minIntimacy: 80, emotions: ['love'] },
  },
  {
    id: 'feed_branch',
    label: '뭐 먹고 싶어?',
    icon: '🍰',
    priority: 11,
    branches: [
      {
        id: 'meal',
        label: '든든한 밥',
        icon: '🍖',
        action: 'feed',
        responses: [
          { text: '배고파요! 든든한 밥 주세요~', emotion: 'happy' },
        ],
      },
      {
        id: 'snack',
        label: '간식',
        icon: '🍪',
        action: 'feed',
        responses: [
          { text: '간식도 좋아요! 달콤한 거요~', emotion: 'happy', moodEffect: 2 },
        ],
      },
    ],
    responses: [{ text: '뭐든 좋아요!', emotion: 'happy' }],
    when: { hungerBelow: 40 },
  },
];

const CHOICE_MAP = new Map(CHAT_CHOICES.map(c => [c.id, c]));

export function getChatDailyCount(state: GameState): number {
  const today = todayStr();
  const daily = state.chatDaily;
  if (!daily || daily.date !== today) return 0;
  return daily.count;
}

export function getChatRemainingToday(state: GameState): number {
  return Math.max(0, CHAT_DAILY_LIMIT - getChatDailyCount(state));
}

export function canUseChatDialogue(state: GameState): boolean {
  return getChatRemainingToday(state) > 0;
}

export function recordChatDialogue(state: GameState): GameState {
  const today = todayStr();
  const prev = state.chatDaily;
  const count = prev?.date === today ? prev.count : 0;
  return {
    ...state,
    chatDaily: { date: today, count: count + 1 },
    lastSaveTime: Date.now(),
  };
}

export function applyChatMoodEffect(state: GameState, delta: number): GameState {
  if (!delta) return state;
  return {
    ...state,
    status: {
      ...state.status,
      mood: Math.min(100, Math.max(0, state.status.mood + delta)),
    },
    lastSaveTime: Date.now(),
  };
}

export function getChatCapResponse(petName: string): ResolvedChat {
  return {
    text: `${petName}이(가) 졸린 듯해요… 오늘은 여기까지 대화해요~ 내일 또 만나요! 💤`,
  };
}

export function getChoicesForContext(ctx: ChatChoiceContext): ChatChoice[] {
  const eligible = CHAT_CHOICES.filter(c => matchesWhen(c.when, ctx));

  const scored = eligible.map(c => ({
    choice: c,
    score: c.priority + contextBoost(c, ctx) + (c.core ? 5 : 0),
  }));

  scored.sort((a, b) => b.score - a.score);

  const picked: ChatChoice[] = [];
  const seen = new Set<string>();

  for (const { choice } of scored) {
    if (seen.has(choice.id)) continue;
    picked.push(choice);
    seen.add(choice.id);
    if (picked.length >= MAX_VISIBLE_CHOICES) break;
  }

  // core 보장: 6개 미만이면 core 항목 채우기
  if (picked.length < MAX_VISIBLE_CHOICES) {
    for (const c of CHAT_CHOICES.filter(x => x.core)) {
      if (seen.has(c.id)) continue;
      if (!matchesWhen(c.when, ctx) && c.when) continue;
      picked.push(c);
      seen.add(c.id);
      if (picked.length >= MAX_VISIBLE_CHOICES) break;
    }
  }

  return picked.slice(0, MAX_VISIBLE_CHOICES);
}

export function resolveChoice(choiceId: string, petName: string): ResolvedChat {
  const choice = CHOICE_MAP.get(choiceId);
  if (!choice) {
    return { text: withPetName('헤헤, 무슨 말인지 모르겠지만 좋아요!', petName) };
  }
  const resp = pick(choice.responses);
  return {
    text: withPetName(resp.text, petName),
    moodEffect: resp.moodEffect,
    action: choice.action,
  };
}

export function resolveBranchChoice(
  choiceId: string,
  branchId: string,
  petName: string,
): ResolvedChat {
  const choice = CHOICE_MAP.get(choiceId);
  const branch = choice?.branches?.find(b => b.id === branchId);
  if (!branch) return resolveChoice(choiceId, petName);
  const resp = pick(branch.responses);
  return {
    text: withPetName(resp.text, petName),
    moodEffect: resp.moodEffect,
    action: branch.action ?? choice?.action,
  };
}

export function getChoiceById(choiceId: string): ChatChoice | undefined {
  return CHOICE_MAP.get(choiceId);
}

export function choiceHasBranches(choiceId: string): boolean {
  const c = CHOICE_MAP.get(choiceId);
  return Boolean(c?.branches && c.branches.length > 0);
}
