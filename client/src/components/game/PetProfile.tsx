/**
 * PetProfile - 반려몬 상세 프로필 화면
 * Cozy Nursery: 능력치, 성장 트레이트, 경험치 바
 */
import { useGame } from '@/contexts/GameContext';

interface PetProfileProps {
  onClose: () => void;
}

export default function PetProfile({ onClose }: PetProfileProps) {
  const { state } = useGame();
  const { pet, status } = state;
  const expPercent = Math.floor((pet.exp / pet.expToNext) * 100);

  const traits = [
    { label: '힘', value: pet.traits.power, icon: '💪', color: 'bg-[oklch(0.75_0.15_30)]' },
    { label: '지능', value: pet.traits.intelligence, icon: '🧠', color: 'bg-[oklch(0.75_0.12_260)]' },
    { label: '매력', value: pet.traits.charm, icon: '💖', color: 'bg-peach' },
    { label: '활력', value: pet.traits.vitality, icon: '🌿', color: 'bg-mint' },
  ];

  const maxTrait = Math.max(pet.traits.power, pet.traits.intelligence, pet.traits.charm, pet.traits.vitality, 1);

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
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663342761074/daLuxDLrpRKKbPdxD8Red2/pocket-egg-petmon-default-KfXhPsiuyY6WW7rKYGHEeV.webp"
            alt={pet.name}
            className="w-24 h-24 mx-auto object-contain mb-2"
          />
          <div className="text-xl font-bold text-warm-brown">{pet.name}</div>
          <div className="text-sm text-sub-brown">{pet.species} · Lv.{pet.level}</div>
          <div className="text-xs text-sub-brown mt-1">친밀도 ♥ {Math.floor(pet.intimacy)}</div>
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
