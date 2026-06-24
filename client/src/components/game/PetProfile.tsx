/**
 * PetProfile - 반려몬 상세 프로필 화면
 * Cozy Nursery: 능력치, 성장 트레이트, 경험치 바
 */
import { useGame } from '@/contexts/GameContext';
import { getCharacterImage } from '@/lib/gameState';
import { useState, useRef } from 'react';

interface PetProfileProps {
  onClose: () => void;
}

export default function PetProfile({ onClose }: PetProfileProps) {
  const { state, rename } = useGame();
  const { pet, status } = state;
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(pet.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNameEdit = () => {
    setNameInput(pet.name);
    setIsEditingName(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleNameConfirm = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== pet.name) {
      rename(trimmed);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleNameConfirm();
    if (e.key === 'Escape') setIsEditingName(false);
  };
  const expPercent = Math.floor((pet.exp / pet.expToNext) * 100);

  const traits = [
    { label: '힘', value: pet.traits.power, icon: '💪', color: 'bg-[oklch(0.75_0.15_30)]' },
    { label: '지능', value: pet.traits.intelligence, icon: '🧠', color: 'bg-[oklch(0.75_0.12_260)]' },
    { label: '매력', value: pet.traits.charm, icon: '💖', color: 'bg-peach' },
    { label: '활력', value: pet.traits.vitality, icon: '🌿', color: 'bg-mint' },
  ];

  const maxTrait = Math.max(pet.traits.power, pet.traits.intelligence, pet.traits.charm, pet.traits.vitality, 1);

  const petImageUrl = getCharacterImage(pet.species, pet.stage);

  const STAGE_LABEL: Record<string, string> = {
    egg: '알',
    baby: '아기',
    child: '어린이',
    teen: '청소년',
    adult: '성체',
  };

  const birthDateStr = new Date(pet.birthDate).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[90%] max-w-sm bg-white/95 backdrop-blur-lg rounded-3xl p-5 shadow-2xl animate-pop-in max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-warm-brown">반려몬 프로필</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sub-brown"
          >
            ✕
          </button>
        </div>

        {/* 반려몬 카드 */}
        <div className="bg-cream rounded-2xl p-4 mb-4 text-center">
          <div className="relative inline-block mb-2">
            <img
              src={petImageUrl}
              alt={pet.name}
              className="w-28 h-28 mx-auto object-contain drop-shadow-md"
            />
            {/* 진화 단계 뱃지 */}
            <span className="absolute bottom-0 right-0 text-[10px] font-bold bg-peach text-white px-2 py-0.5 rounded-full shadow">
              {STAGE_LABEL[pet.stage] ?? pet.stage}
            </span>
          </div>
          {/* 이름 (인라인 편집) */}
          {isEditingName ? (
            <div className="flex items-center justify-center gap-1 mt-1">
              <input
                ref={inputRef}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={handleNameKeyDown}
                maxLength={12}
                className="text-center text-lg font-bold text-warm-brown bg-white/80 border-2 border-peach rounded-xl px-2 py-0.5 w-36 outline-none"
              />
              <button
                onClick={handleNameConfirm}
                className="text-sm bg-peach text-white rounded-full w-7 h-7 flex items-center justify-center font-bold"
              >✓</button>
              <button
                onClick={() => setIsEditingName(false)}
                className="text-sm bg-muted text-sub-brown rounded-full w-7 h-7 flex items-center justify-center"
              >✕</button>
            </div>
          ) : (
            <button
              onClick={handleNameEdit}
              className="flex items-center justify-center gap-1 group mt-1"
            >
              <span className="text-xl font-bold text-warm-brown">{pet.name}</span>
              <span className="text-xs text-sub-brown/50 group-hover:text-peach transition-colors">✏️</span>
            </button>
          )}
          <div className="text-sm text-sub-brown">{pet.species} · Lv.{pet.level}</div>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="text-xs text-sub-brown">친밀도 ♥ {Math.floor(pet.intimacy)}</span>
            <span className="text-[10px] text-sub-brown/70">탄생 {birthDateStr}</span>
          </div>
        </div>

        {/* 경험치 바 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-sub-brown mb-1">
            <span>경험치</span>
            <span>{pet.exp}/{pet.expToNext}</span>
          </div>
          <div className="w-full h-3 bubble-gauge overflow-hidden">
            <div
              className="h-full bg-peach rounded-full transition-all duration-500"
              style={{ width: `${expPercent}%` }}
            />
          </div>
        </div>

        {/* 현재 상태 */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-cream rounded-xl p-2 text-center">
            <div className="text-lg">🍖</div>
            <div className="text-xs text-sub-brown">배고픔</div>
            <div className="text-sm font-bold text-warm-brown">{Math.floor(status.hunger)}%</div>
          </div>
          <div className="bg-cream rounded-xl p-2 text-center">
            <div className="text-lg">😊</div>
            <div className="text-xs text-sub-brown">기분</div>
            <div className="text-sm font-bold text-warm-brown">{Math.floor(status.mood)}%</div>
          </div>
          <div className="bg-cream rounded-xl p-2 text-center">
            <div className="text-lg">💧</div>
            <div className="text-xs text-sub-brown">청결</div>
            <div className="text-sm font-bold text-warm-brown">{Math.floor(status.clean)}%</div>
          </div>
          <div className="bg-cream rounded-xl p-2 text-center">
            <div className="text-lg">💤</div>
            <div className="text-xs text-sub-brown">피로</div>
            <div className="text-sm font-bold text-warm-brown">{Math.floor(status.fatigue)}%</div>
          </div>
        </div>

        {/* 성장 트레이트 */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-warm-brown mb-2">성장 성향</h3>
          <div className="space-y-2">
            {traits.map(t => (
              <div key={t.label} className="flex items-center gap-2">
                <span className="text-sm w-5">{t.icon}</span>
                <span className="text-xs text-sub-brown w-8">{t.label}</span>
                <div className="flex-1 h-2 bubble-gauge overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${t.color}`}
                    style={{ width: `${maxTrait > 0 ? (t.value / maxTrait) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-warm-brown w-6 text-right">{t.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 진화 힌트 */}
        <div className="bg-lavender-light rounded-2xl p-3 text-center">
          <div className="text-xs text-sub-brown">
            {getEvolutionHint(pet.level, pet.stage)}
          </div>
        </div>

        <style>{`
          @keyframes pop-in {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-pop-in {
            animation: pop-in 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
          }
        `}</style>
      </div>
    </div>
  );
}

function getEvolutionHint(level: number, stage: string): string {
  if (stage === 'baby') return `Lv.5에 진화할 수 있어요! (현재 Lv.${level})`;
  if (stage === 'child') return `Lv.15에 다음 진화가 가능해요! (현재 Lv.${level})`;
  if (stage === 'teen') return `Lv.30에 최종 진화를 할 수 있어요! (현재 Lv.${level})`;
  return '최종 진화를 달성했어요! 🎉';
}
