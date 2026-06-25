/**
 * EvolutionScreen - 진화 연출 화면
 * Cozy Nursery: 화려한 파티클, 축하 분위
 */
import { useGame } from '@/contexts/GameContext';
import { getCharacterImage } from '@/lib/gameState';

export default function EvolutionScreen() {
  const { pendingEvolution, confirmEvolution, state } = useGame();

  if (!pendingEvolution) return null;

  // 진화 후 새 종족 이미지
  const newPetImageUrl = getCharacterImage(pendingEvolution.newSpecies, pendingEvolution.newStage);

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-6 mx-4 shadow-2xl animate-pop-in text-center max-w-sm w-full">
        {/* 타이틀 */}
        <div className="text-2xl font-bold text-peach mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
          {pendingEvolution.newStage === 'baby' && pendingEvolution.newSpecies === '기본몬'
            ? '🐣 부화 성공! 🐣'
            : pendingEvolution.newStage === 'mythic'
            ? '✨ 전설 진화! ✨'
            : '✨ 진화 완료! ✨'}
        </div>

        {/* 반려몬 이미지 */}
        <div className="my-4 relative">
          <img
            src={newPetImageUrl}
            alt={pendingEvolution.newSpecies}
            className="w-32 h-32 mx-auto object-contain animate-bounce-gentle"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-4xl animate-spin-slow opacity-30">⭐</div>
          </div>
        </div>

        {/* 새 종족 이름 */}
        <div className="text-xl font-bold text-warm-brown mb-1">
          {pendingEvolution.newSpecies}
        </div>
        <div className="text-sm text-sub-brown mb-4">
          {pendingEvolution.newStage === 'baby' && pendingEvolution.newSpecies === '기본몬'
            ? `🥚 알에서 ${state.pet.name}이(가) 태어났어요!`
            : `${state.pet.name}이(가) 새로운 모습으로 진화했어요!`}
        </div>

        {/* 능력치 변화 */}
        <div className="bg-cream rounded-2xl p-3 mb-4">
          <div className="text-xs text-sub-brown mb-2 font-semibold">새로운 능력치</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {pendingEvolution.statBoosts.power && (
              <div className="flex items-center gap-1">
                <span>💪</span>
                <span className="text-warm-brown">힘 +{pendingEvolution.statBoosts.power}</span>
              </div>
            )}
            {pendingEvolution.statBoosts.intelligence && (
              <div className="flex items-center gap-1">
                <span>🧠</span>
                <span className="text-warm-brown">지능 +{pendingEvolution.statBoosts.intelligence}</span>
              </div>
            )}
            {pendingEvolution.statBoosts.charm && (
              <div className="flex items-center gap-1">
                <span>💖</span>
                <span className="text-warm-brown">매력 +{pendingEvolution.statBoosts.charm}</span>
              </div>
            )}
            {pendingEvolution.statBoosts.vitality && (
              <div className="flex items-center gap-1">
                <span>🌿</span>
                <span className="text-warm-brown">활력 +{pendingEvolution.statBoosts.vitality}</span>
              </div>
            )}
          </div>
        </div>

        {/* 확인 버튼 */}
        <button
          onClick={confirmEvolution}
          className="w-full py-3 bg-peach text-white font-bold rounded-2xl cushion-btn text-lg"
        >
          확인
        </button>

        <style>{`
          @keyframes pop-in {
            0% { transform: scale(0.8); opacity: 0; }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-pop-in {
            animation: pop-in 500ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
          }
          @keyframes bounce-gentle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .animate-bounce-gentle {
            animation: bounce-gentle 2s ease-in-out infinite;
          }
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spin-slow 4s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
