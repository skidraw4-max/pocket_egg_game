/**
 * EggSelectScreen — 최초 게임 시작 시 5색 알 선택 화면
 * 플레이어가 직접 알 색상을 선택하고 각 알의 패시브 능력을 확인할 수 있음
 */
import { useState } from 'react';
import { SELECT_EGGS, type EggColorId, type SelectEggDef } from '@/lib/eggTypes';

interface EggSelectScreenProps {
  onSelect: (eggColor: EggColorId) => void;
}

export default function EggSelectScreen({ onSelect }: EggSelectScreenProps) {
  const [selected, setSelected] = useState<EggColorId | null>(null);
  const [detail, setDetail] = useState<SelectEggDef | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleCardClick = (egg: SelectEggDef) => {
    setSelected(egg.id);
    setDetail(egg);
  };

  const handleConfirm = () => {
    if (!selected) return;
    setConfirming(true);
    setTimeout(() => onSelect(selected), 700);
  };

  return (
    <div
      className="absolute inset-0 z-[300] flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 50%, #1e1b4b 100%)' }}
    >
      {/* 별 배경 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {['⭐','✨','💫','🌟','⭐','✨','💫'].map((s, i) => (
          <span
            key={i}
            className="absolute opacity-30 text-lg"
            style={{
              left: `${8 + i * 13}%`,
              top: `${5 + (i % 4) * 18}%`,
              animation: `star-twinkle ${2 + i * 0.5}s ease-in-out ${i * 0.4}s infinite`,
            }}
          >{s}</span>
        ))}
      </div>

      {/* 헤더 */}
      <div className="relative z-10 flex flex-col items-center pt-10 pb-4 px-6">
        <div className="text-4xl mb-2">🥚</div>
        <h1 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
          알을 선택하세요!
        </h1>
        <p className="text-white/60 text-sm text-center">
          각 알은 고유한 패시브 능력을 가지고 있어요
        </p>
      </div>

      {/* 알 카드 그리드 */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {SELECT_EGGS.map(egg => (
            <button
              key={egg.id}
              onClick={() => handleCardClick(egg)}
              className="relative rounded-3xl p-4 text-left transition-all duration-200 active:scale-95"
              style={{
                background: egg.gradient,
                border: `3px solid ${selected === egg.id ? '#fff' : egg.borderColor + '80'}`,
                boxShadow: selected === egg.id
                  ? `0 0 20px ${egg.color}80, 0 4px 12px rgba(0,0,0,0.3)`
                  : '0 4px 12px rgba(0,0,0,0.2)',
                transform: selected === egg.id ? 'scale(1.03)' : 'scale(1)',
              }}
            >
              {/* 선택 체크 */}
              {selected === egg.id && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold" style={{ color: egg.color }}>
                  ✓
                </div>
              )}

              <div className="text-4xl mb-2">{egg.emoji}</div>
              <div className="text-white font-black text-base mb-1">{egg.name}</div>
              <div className="text-white/80 text-xs font-semibold mb-2">{egg.passive}</div>
              <div className="text-white/60 text-[10px] leading-relaxed">{egg.evolutionHint}</div>
            </button>
          ))}
        </div>

        {/* 선택된 알 상세 정보 */}
        {detail && (
          <div
            className="rounded-3xl p-4 mb-4 border"
            style={{
              background: detail.color + '20',
              borderColor: detail.borderColor + '60',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{detail.emoji}</span>
              <div>
                <div className="text-white font-black text-lg">{detail.name}</div>
                <div className="text-white/60 text-xs">{detail.description}</div>
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 mb-2">
              <div className="text-white/50 text-[10px] mb-1">패시브 능력</div>
              <div className="text-white font-bold text-sm mb-1">{detail.passive}</div>
              <div className="text-white/70 text-xs">{detail.passiveDetail}</div>
            </div>
            {detail.passiveEffect.traitBonus && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(detail.passiveEffect.traitBonus).map(([trait, val]) => (
                  <span
                    key={trait}
                    className="px-2 py-1 rounded-full text-white text-[10px] font-bold"
                    style={{ background: detail.color + '60' }}
                  >
                    {trait === 'power' ? '힘' : trait === 'intelligence' ? '지능' : trait === 'charm' ? '매력' : '활력'} +{val}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 확인 버튼 */}
      <div className="relative z-10 px-6 pb-8 pt-2">
        <button
          onClick={handleConfirm}
          disabled={!selected || confirming}
          className="w-full py-4 rounded-2xl font-black text-white text-lg transition-all duration-200 active:scale-95 disabled:opacity-40"
          style={{
            background: selected
              ? `linear-gradient(135deg, ${getSelectEggColor(selected)}, ${getSelectEggColor(selected)}cc)`
              : 'rgba(255,255,255,0.2)',
            boxShadow: selected ? `0 4px 20px ${getSelectEggColor(selected)}60` : 'none',
            opacity: confirming ? 0 : 1,
            transition: 'opacity 0.7s ease',
          }}
        >
          {selected
            ? `${SELECT_EGGS.find(e => e.id === selected)?.emoji} 이 알로 시작하기!`
            : '알을 선택해주세요'}
        </button>
      </div>

      <style>{`
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

function getSelectEggColor(id: EggColorId): string {
  return SELECT_EGGS.find(e => e.id === id)?.color ?? '#8B5CF6';
}
