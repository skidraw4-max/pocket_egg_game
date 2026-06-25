/**
 * PetDisplay - 반려몬 표시 영역
 * Cozy Nursery: 액션별 모션 + 감정 표현 시스템 통합
 * 
 * 감정 우선순위 (액션 중이 아닐 때):
 * 1. love: 친밀도 80+ & 모든 상태 70+
 * 2. hungry: 배고픔 < 30
 * 3. dirty: 청결 < 30
 * 4. tired: 피로 > 70
 * 5. happy: 기분 > 70
 * 6. idle: 기본 상태
 */
import { useGame, PetAction } from '@/contexts/GameContext';
import { PetProfile, PetStatus, getCharacterImage } from '@/lib/gameState';
import { useSound } from '@/hooks/useSound';
import { useMemo, useState, useEffect, useRef } from 'react';

interface PetDisplayProps {
  pet: PetProfile;
  isSleeping: boolean;
  onLongPress?: () => void;
}

/** 감정 타입 */
type Emotion = 'idle' | 'happy' | 'hungry' | 'dirty' | 'tired' | 'love';

/** 액션별 이미지 URL */
const ACTION_IMAGES: Record<PetAction, string> = {
  idle: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-petmon-default-KfXhPsiuyY6WW7rKYGHEeV.webp',
  eating: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-petmon-eating-iPtYB8zRyPTyfSxY46k6Z8.webp',
  playing: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-petmon-playing-iAoYWMacM6rjtKi3NPymsi.webp',
  cleaning: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-petmon-cleaning-NVSBP3uV68LLcHwT2qBdHp.webp',
  sleeping: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-petmon-sleeping-Z9nFRhMsPtfNXSXfoFGSFP.webp',
};

/** 감정별 이미지 URL */
const EMOTION_IMAGES: Record<Emotion, string> = {
  idle: ACTION_IMAGES.idle,
  happy: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-emotion-happy-XGqwzqZwAwe4jy9tZnEBG5.webp',
  hungry: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-emotion-hungry-oWqg5MoqZ982zP5dEzAw67.webp',
  dirty: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-emotion-dirty-iedz2HZ5XCUNAVqprzTPKf.webp',
  tired: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-emotion-tired-f6jBaR8AwCZ7Fzux6eGCET.webp',
  love: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-emotion-love-XKC3JDJ6qxT7qMf3eGRwBR.webp',
};

/** 감정별 CSS 애니메이션 */
const EMOTION_ANIMATION: Record<Emotion, string> = {
  idle: 'breathe 3s ease-in-out infinite',
  happy: 'happy-bounce 1.2s ease-in-out infinite',
  hungry: 'sad-shake 2s ease-in-out infinite',
  dirty: 'dirty-tremble 0.8s ease-in-out infinite',
  tired: 'tired-sway 3s ease-in-out infinite',
  love: 'love-pulse 1.5s ease-in-out infinite',
};

/** 감정별 말풍선 텍스트 */
const EMOTION_BUBBLE: Record<Emotion, string | null> = {
  idle: null,
  happy: '기분 좋아~!',
  hungry: '배고파...',
  dirty: '씻고 싶어...',
  tired: '졸려...',
  love: '사랑해!',
};

/** 액션별 CSS 애니메이션 이름 */
const ACTION_ANIMATION: Record<PetAction, string> = {
  idle: 'breathe 3s ease-in-out infinite',
  eating: 'munch 0.4s ease-in-out 4',
  playing: 'bounce-play 0.5s ease-in-out 5',
  cleaning: 'wiggle-clean 0.6s ease-in-out 3',
  sleeping: 'none',
};

/** 액션별 이펙트 이모지 */
const ACTION_EFFECT: Record<PetAction, string | null> = {
  idle: null,
  eating: '✨',
  playing: '⭐',
  cleaning: '🫧',
  sleeping: '💤',
};

/** 상태 수치로 감정 판단 */
function determineEmotion(status: PetStatus, intimacy: number): Emotion {
  // 최우선: 사랑 (친밀도 높고 모든 상태 양호)
  if (intimacy >= 80 && status.hunger >= 70 && status.mood >= 70 && status.clean >= 70 && status.fatigue <= 30) {
    return 'love';
  }
  // 위기 상태 (수치가 매우 낮을 때)
  if (status.hunger < 30) return 'hungry';
  if (status.clean < 30) return 'dirty';
  if (status.fatigue > 70) return 'tired';
  // 행복 (기분 좋을 때)
  if (status.mood > 70) return 'happy';
  // 기본
  return 'idle';
}

export default function PetDisplay({ pet, isSleeping, onLongPress }: PetDisplayProps) {
  const { touch, currentAction: gameCurrentAction, state } = useGame();
  // 게임 액션 상태 동기화
  useEffect(() => {
    setCurrentActionLocal(gameCurrentAction);
  }, [gameCurrentAction]);
  const { play: playSound } = useSound();
  const [isTouched, setIsTouched] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const prevEmotionRef = useRef<Emotion>('idle');
  const [_currentActionLocal, setCurrentActionLocal] = useState<PetAction>('idle');

  // 감정 판단
  const emotion = useMemo(() => {
    return determineEmotion(state.status, pet.intimacy);
  }, [state.status, pet.intimacy]);

  // 종족 변경 시 액션 리셋
  useEffect(() => {
    setCurrentActionLocal('idle');
  }, [pet.species, pet.stage]);

  // 감정 변화 시 효과음 재생
  useEffect(() => {
    if (gameCurrentAction !== 'idle' || isSleeping) return; // 액션 중이거나 수면 중이면 감정음 재생 안 함
    if (emotion === prevEmotionRef.current) return; // 감정이 같으면 재생 안 함

    // 감정 변화에 따른 효과음 재생
    if (emotion === 'love') playSound('love');
    else if (emotion === 'happy') playSound('happy');
    else if (emotion === 'hungry') playSound('hungry');
    else if (emotion === 'dirty') playSound('dirty');
    else if (emotion === 'tired') playSound('tired');

    prevEmotionRef.current = emotion;
  }, [emotion, gameCurrentAction, isSleeping, playSound]);

  const handleTouch = () => {
    if (isSleeping || gameCurrentAction !== 'idle') return;
    touch();
    setIsTouched(true);
    setShowHeart(true);
    setTimeout(() => setIsTouched(false), 300);
    setTimeout(() => setShowHeart(false), 1000);
    // 터치 효과음은 GameContext에서 이미 재생됨
  };

  // 알 단계 여부
  const isEgg = pet.stage === 'egg';

  // 이미지 결정: 알 단계 > 액션 > 수면 > 감정 > 기본 (종족별 진화 이미지 적용)
  const petImage = (() => {
    if (isEgg) return getCharacterImage(pet.species, 'egg');
    if (isSleeping) return ACTION_IMAGES.sleeping;
    if (gameCurrentAction !== 'idle') return ACTION_IMAGES[gameCurrentAction];
    // 감정이 idle이 아니면 감정 이미지 사용, idle이면 종족별 진화 이미지 사용
    if (emotion !== 'idle') return EMOTION_IMAGES[emotion];
    return getCharacterImage(pet.species, pet.stage);
  })();

  // 애니메이션 결정
  const petAnimation = (() => {
    if (isEgg) return 'egg-wobble 2s ease-in-out infinite';
    if (isSleeping) return 'none';
    if (gameCurrentAction !== 'idle') return ACTION_ANIMATION[gameCurrentAction];
    return EMOTION_ANIMATION[emotion];
  })();

  const effectEmoji = gameCurrentAction !== 'idle' ? ACTION_EFFECT[gameCurrentAction] : null;
  const emotionBubble = gameCurrentAction === 'idle' ? EMOTION_BUBBLE[emotion] : null;

  return (
    <div className="relative flex flex-col items-center">
      {/* 반려몬 이름 + 레벨 (클릭 시 프로필) */}
      <button
        onClick={onLongPress}
        className="mb-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-1.5 shadow-sm cushion-btn flex items-center gap-1.5 min-h-[44px]"
        title="프로필 보기"
      >
        <span className="text-base">👤</span>
        <span className="text-sm font-bold text-warm-brown" style={{ fontFamily: 'Nunito, sans-serif' }}>
          {pet.name}
        </span>
        <span className="text-xs text-sub-brown">Lv.{pet.level}</span>
        <span className="text-xs text-sub-brown">♥ {Math.floor(pet.intimacy)}</span>
      </button>

      {/* 감정 말풍선 */}
      {emotionBubble && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 animate-emotion-bubble">
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-1.5 shadow-md border border-white/50">
            <span className="text-xs font-semibold" style={{ color: emotionColor(emotion) }}>
              {emotionBubble}
            </span>
            {/* 말풍선 꼬리 */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 rotate-45 border-r border-b border-white/50" />
          </div>
        </div>
      )}

      {/* 반려몬 이미지 */}
      <div
        className="relative cursor-pointer"
        onClick={handleTouch}
        style={{
          transform: isTouched ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 300ms cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <img
          src={petImage}
          alt={pet.name}
          className="w-48 h-48 object-contain drop-shadow-lg"
          style={{ animation: petAnimation }}
          key={`${gameCurrentAction}-${emotion}`}
        />

        {/* 액션 이펙트 파티클 */}
        {effectEmoji && (
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            <span className="absolute top-0 left-2 text-xl animate-particle-1">{effectEmoji}</span>
            <span className="absolute top-4 right-0 text-lg animate-particle-2">{effectEmoji}</span>
            <span className="absolute bottom-8 left-0 text-base animate-particle-3">{effectEmoji}</span>
            <span className="absolute top-2 right-6 text-sm animate-particle-4">{effectEmoji}</span>
          </div>
        )}

        {/* 하트 이펙트 (터치) */}
        {showHeart && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-float-up">
            <span className="text-2xl">💕</span>
          </div>
        )}
      </div>

      {/* 종족 정보 / 알 단계 부화 힌트 */}
      {isEgg ? (
        <div className="mt-2 flex flex-col items-center gap-1">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-sm text-center">
            <p className="text-xs font-bold text-peach">🥚 신비로운 알</p>
            <p className="text-[10px] text-sub-brown mt-0.5">먹이를 주고 돌봐주면 부화해요!</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1">
            <div className="w-20 h-1.5 bg-peach/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-peach to-lavender rounded-full transition-all"
                style={{ width: `${Math.min(100, (pet.exp / pet.expToNext) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-sub-brown">{pet.exp}/{pet.expToNext}</span>
          </div>
        </div>
      ) : (
        <div className="mt-1 text-xs text-sub-brown/70">
          {pet.species} · {stageLabel(pet.stage)}
        </div>
      )}

      {/* 액션 라벨 */}
      {gameCurrentAction !== 'idle' && (
        <div className="mt-1 bg-white/80 backdrop-blur-sm rounded-full px-3 py-0.5 shadow-sm animate-fade-in">
          <span className="text-xs font-semibold text-peach">
            {actionLabel(gameCurrentAction)}
          </span>
        </div>
      )}

      <style>{`
        @keyframes egg-wobble {
          0%, 100% { transform: rotate(0deg) scale(1); }
          15% { transform: rotate(-4deg) scale(1.02); }
          30% { transform: rotate(4deg) scale(1.02); }
          45% { transform: rotate(-2deg) scale(1.01); }
          60% { transform: rotate(2deg) scale(1.01); }
          75% { transform: rotate(0deg) scale(1); }
        }
        @keyframes breathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes happy-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(-2deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-5px) rotate(2deg); }
        }
        @keyframes sad-shake {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(2px); }
          50% { transform: translateY(0); }
          75% { transform: translateY(3px); }
        }
        @keyframes dirty-tremble {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          50% { transform: translateX(1px); }
          75% { transform: translateX(-1px); }
        }
        @keyframes tired-sway {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(2px) rotate(-2deg); }
          50% { transform: translateY(4px) rotate(0deg); }
          75% { transform: translateY(2px) rotate(2deg); }
        }
        @keyframes love-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes munch {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(-3deg); }
          50% { transform: translateY(2px) rotate(0deg); }
          75% { transform: translateY(-2px) rotate(3deg); }
        }
        @keyframes bounce-play {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-20px) scale(1.05); }
          50% { transform: translateY(-25px) scale(1.08); }
          70% { transform: translateY(-10px) scale(1.02); }
        }
        @keyframes wiggle-clean {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          20% { transform: translateX(-5px) rotate(-3deg); }
          40% { transform: translateX(5px) rotate(3deg); }
          60% { transform: translateX(-3px) rotate(-2deg); }
          80% { transform: translateX(3px) rotate(2deg); }
        }
        @keyframes float-up {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -30px) scale(1.3); }
        }
        .animate-float-up {
          animation: float-up 1s ease-out forwards;
        }
        @keyframes particle-1 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          30% { opacity: 1; transform: translate(-10px, -20px) scale(1); }
          100% { opacity: 0; transform: translate(-20px, -40px) scale(0.3); }
        }
        @keyframes particle-2 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          40% { opacity: 1; transform: translate(15px, -25px) scale(1.1); }
          100% { opacity: 0; transform: translate(25px, -45px) scale(0.2); }
        }
        @keyframes particle-3 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          35% { opacity: 1; transform: translate(-12px, -15px) scale(0.9); }
          100% { opacity: 0; transform: translate(-18px, -35px) scale(0.3); }
        }
        @keyframes particle-4 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
          45% { opacity: 1; transform: translate(8px, -22px) scale(1); }
          100% { opacity: 0; transform: translate(12px, -38px) scale(0.2); }
        }
        .animate-particle-1 { animation: particle-1 2s ease-out infinite; }
        .animate-particle-2 { animation: particle-2 2s ease-out 0.3s infinite; }
        .animate-particle-3 { animation: particle-3 2s ease-out 0.6s infinite; }
        .animate-particle-4 { animation: particle-4 2s ease-out 0.9s infinite; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 300ms ease-out forwards;
        }
        @keyframes emotion-bubble {
          0% { opacity: 0; transform: translate(-50%, 5px) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          80% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0.8; transform: translate(-50%, -2px) scale(0.98); }
        }
        .animate-emotion-bubble {
          animation: emotion-bubble 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function stageLabel(stage: PetProfile['stage']): string {
  const labels: Record<PetProfile['stage'], string> = {
    egg: '알',
    baby: '아기',
    child: '어린이',
    teen: '청소년',
    adult: '성체',
    mythic: '✨ 전설',
  };
  return labels[stage] ?? stage;
}

function actionLabel(action: PetAction): string {
  const labels: Record<PetAction, string> = {
    idle: '',
    eating: '냠냠 먹는 중...',
    playing: '신나게 놀이 중!',
    cleaning: '뽀득뽀득 목욕 중~',
    sleeping: '쿨쿨...',
  };
  return labels[action];
}

function emotionColor(emotion: Emotion): string {
  const colors: Record<Emotion, string> = {
    idle: '#8B7355',
    happy: '#FF9F43',
    hungry: '#6C5CE7',
    dirty: '#A0522D',
    tired: '#636E72',
    love: '#E84393',
  };
  return colors[emotion];
}
